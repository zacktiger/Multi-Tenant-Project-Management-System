const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getClient } = require('../config/db');
const env = require('../config/env');
const userModel = require('../models/user.model');
const orgModel = require('../models/org.model');
const tokenModel = require('../models/token.model');
const { badRequest, unauthorized, forbidden, notFound, conflict } = require('../utils/AppError');

/** Columns safe to return to a client — deliberately excludes password_hash. */
const SAFE_USER_FIELDS = 'id, name, email, avatar_url, is_verified, created_at, updated_at';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const BCRYPT_ROUNDS = 10;

// ─── TOKEN HELPERS ────────────────────────────────────────

/**
 * Hashes a refresh token for storage.
 *
 * The database stores only this hash, never the token itself, so dumping the
 * refresh_tokens table yields nothing an attacker can present as a credential.
 *
 * SHA-256 rather than bcrypt is the right call here, and it is worth being able
 * to explain why: bcrypt is deliberately slow to make brute-forcing *guessable*
 * secrets expensive. A refresh token is a 128-bit random UUID — there is nothing
 * to guess, so bcrypt's cost would buy no security while slowing every refresh.
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** "Acme Corp" → "acme-corp-1f4b". The random suffix keeps slugs unique. */
function generateSlug(name) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const suffix = crypto.randomBytes(2).toString('hex');
  return `${base}-${suffix}`;
}

function generateAccessToken(payload) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}

/**
 * Issues the pair of tokens a signed-in session runs on.
 *
 * The access token is a short-lived JWT: it is verified by signature alone, so
 * the common path never touches the database. The refresh token is a long-lived
 * opaque random value stored (hashed) in the database, which is what makes it
 * revocable. Short + stateless for speed, long + stateful for control.
 */
async function issueTokens(userId, orgId, role) {
  const accessToken = generateAccessToken({ userId, orgId, role });

  const refreshToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await tokenModel.createRefreshToken({
    userId,
    tokenHash: hashToken(refreshToken),
    expiresAt,
  });

  return { accessToken, refreshToken };
}

/** The organization shape returned alongside a freshly issued session. */
function toSessionOrg(org, role) {
  return { id: org.id, name: org.name, slug: org.slug, role };
}

/** The user shape returned alongside a freshly issued session. */
function toSessionUser(user) {
  return { id: user.id, name: user.name, email: user.email };
}

// ─── SIGNUP ───────────────────────────────────────────────

/**
 * Creates a user, their organization, their membership, and a default
 * workspace — as one atomic unit.
 *
 * All four inserts share a single transaction because a half-finished signup is
 * unusable: a user with no organization cannot log in (see `login` below, which
 * rejects with NO_ORG), and an organization with no admin can never be
 * administered. Either the whole account exists or none of it does.
 */
async function signup({ name, email, password, orgName }) {
  const existing = await userModel.findUserByEmail(email);
  if (existing) {
    throw conflict('Email already registered', 'EMAIL_EXISTS');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // 1. The user
    const userResult = await client.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING ${SAFE_USER_FIELDS}`,
      [name, email, passwordHash]
    );
    const user = userResult.rows[0];

    // 2. Their organization
    const orgResult = await client.query(
      `INSERT INTO organizations (name, slug, created_by)
       VALUES ($1, $2, $3)
       RETURNING id, name, slug, created_by, created_at`,
      [orgName, generateSlug(orgName), user.id]
    );
    const organization = orgResult.rows[0];

    // 3. Their membership — the creator is always an admin
    await client.query(
      `INSERT INTO organization_members (user_id, organization_id, role)
       VALUES ($1, $2, $3)`,
      [user.id, organization.id, 'admin']
    );

    // 4. A default workspace, so the account isn't empty on first login
    await client.query(
      `INSERT INTO workspaces (organization_id, name, created_by)
       VALUES ($1, $2, $3)`,
      [organization.id, 'General', user.id]
    );

    await client.query('COMMIT');

    // Tokens are issued after COMMIT: a session must never outlive a rolled-back
    // account.
    const tokens = await issueTokens(user.id, organization.id, 'admin');

    return {
      user: toSessionUser(user),
      organization: toSessionOrg(organization, 'admin'),
      ...tokens,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    err.statusCode = err.statusCode || 500;
    err.code = err.code || 'SIGNUP_FAILED';
    throw err;
  } finally {
    // Always return the connection to the pool. Skipping this leaks a client,
    // and enough leaks exhaust the pool and hang the entire API.
    client.release();
  }
}

// ─── LOGIN ────────────────────────────────────────────────

async function login({ email, password }) {
  const user = await userModel.findUserByEmail(email);

  /*
   * An unknown email and a wrong password return the identical error. Saying
   * "no such user" would let anyone probe which addresses have accounts here.
   */
  if (!user) {
    throw unauthorized('Invalid credentials', 'INVALID_CREDENTIALS');
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw unauthorized('Invalid credentials', 'INVALID_CREDENTIALS');
  }

  const orgs = await orgModel.findOrgsByUserId(user.id);
  if (!orgs.length) {
    throw notFound('No organization found for user', 'NO_ORG');
  }

  // Sessions are scoped to one organization at a time; default to the newest.
  // Switching is an explicit action that reissues tokens (see switchOrganization).
  const membership = orgs[0];
  const tokens = await issueTokens(user.id, membership.id, membership.role);

  return {
    user: toSessionUser(user),
    organization: toSessionOrg(membership, membership.role),
    ...tokens,
  };
}

// ─── REFRESH ──────────────────────────────────────────────

/**
 * Exchanges a refresh token for a new pair, and revokes the one just used.
 *
 * Rotation means every refresh token is single-use. That is what makes the
 * reuse check below meaningful: an already-revoked token showing up again can
 * only mean a replay — either an attacker using a token the real user has
 * already rotated past, or the real user presenting one an attacker already
 * burned. The system cannot tell which, so it assumes theft and kills every
 * session for that user, forcing a fresh login.
 *
 * The cost of being wrong (a duplicate tab or a retried request logs someone
 * out) is far smaller than the cost of ignoring a real compromise. This is the
 * technique auth vendors call "refresh token rotation with reuse detection".
 */
async function refresh({ refreshToken }) {
  const stored = await tokenModel.findTokenByHash(hashToken(refreshToken));

  if (!stored) {
    throw unauthorized('Refresh token not found', 'TOKEN_NOT_FOUND');
  }

  if (stored.revoked_at) {
    console.error(`⚠️  TOKEN REUSE DETECTED for user ${stored.user_id} — revoking all tokens`);
    await tokenModel.revokeAllUserTokens(stored.user_id);
    throw unauthorized('Token reuse detected — all sessions revoked', 'TOKEN_REVOKED');
  }

  if (new Date(stored.expires_at) < new Date()) {
    await tokenModel.revokeTokenById(stored.id);
    throw unauthorized('Refresh token expired', 'TOKEN_EXPIRED');
  }

  const user = await userModel.findUserById(stored.user_id);
  if (!user) {
    await tokenModel.revokeTokenById(stored.id);
    throw unauthorized('User not found', 'USER_NOT_FOUND');
  }

  const orgs = await orgModel.findOrgsByUserId(stored.user_id);
  const membership = orgs[0] || null;

  // Revoke before issuing: this is the rotation step that makes the used token
  // single-use and arms reuse detection for the next request that presents it.
  await tokenModel.revokeTokenById(stored.id);

  return issueTokens(
    stored.user_id,
    membership ? membership.id : null,
    membership ? membership.role : 'member'
  );
}

// ─── LOGOUT ───────────────────────────────────────────────

/**
 * Revokes the presented refresh token, if it exists.
 *
 * Silent when the token is unknown: logging out is something the client should
 * always be able to complete, and there is nothing useful to report.
 */
async function logout({ refreshToken }) {
  const stored = await tokenModel.findTokenByHash(hashToken(refreshToken));
  if (stored) {
    await tokenModel.revokeTokenById(stored.id);
  }
}

// ─── PROFILE & ORG SWITCHING ──────────────────────────────

async function getMe(userId) {
  const user = await userModel.findUserById(userId);
  if (!user) {
    throw notFound('User not found', 'NOT_FOUND');
  }

  const organizations = await orgModel.findOrgsByUserId(userId);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar_url: user.avatar_url,
      created_at: user.created_at,
    },
    organizations,
  };
}

/**
 * Moves the session to a different organization the user belongs to.
 *
 * This has to reissue tokens rather than just flip a client-side value: the
 * active `orgId` lives inside the signed JWT, which the client cannot alter.
 * Membership is re-checked here so a stale token can't be traded for access to
 * an organization the user has since been removed from.
 */
async function switchOrganization({ userId, orgId }) {
  const membership = await orgModel.findMembership(userId, orgId);
  if (!membership) {
    throw forbidden('You are not a member of this organization', 'NOT_MEMBER');
  }

  const org = await orgModel.findOrgById(orgId);
  const tokens = await issueTokens(userId, orgId, membership.role);

  return {
    organization: toSessionOrg(org, membership.role),
    ...tokens,
  };
}

// ─── INVITATIONS ──────────────────────────────────────────

/**
 * Validates an invitation token and returns the invitation, or throws.
 *
 * Shared by `getInvitation` (which previews the invite before the user acts on
 * it) and `acceptInvitation` (which consumes it). Both need the same three
 * checks, and re-checking at accept time matters — the invite could have
 * expired or been used in the gap between loading the page and submitting it.
 */
async function loadUsableInvitation(token, notFoundMessage) {
  const invitation = await orgModel.findInvitationByToken(token);

  if (!invitation) {
    throw notFound(notFoundMessage, 'INVITATION_NOT_FOUND');
  }
  if (invitation.accepted_at) {
    throw badRequest('This invitation has already been accepted', 'INVITATION_ALREADY_ACCEPTED');
  }
  if (new Date(invitation.expires_at) < new Date()) {
    throw badRequest('This invitation has expired', 'INVITATION_EXPIRED');
  }

  return invitation;
}

async function acceptInvitation({ token, name, password }) {
  const invitation = await loadUsableInvitation(token, 'Invalid invitation link');

  const normalizedEmail = invitation.email.toLowerCase();
  let user = await userModel.findUserByEmail(normalizedEmail);

  // No account yet: the invite doubles as the signup form, so credentials are
  // required. An existing user just joins with the account they already have.
  if (!user) {
    if (!name || !password) {
      throw badRequest('Full Name and Password are required', 'CREDENTIALS_REQUIRED');
    }
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    user = await userModel.createUser({ name, email: normalizedEmail, passwordHash });
  }

  const organizationId = invitation.organization_id;
  const organization = await orgModel.findOrgById(organizationId);
  if (!organization) {
    throw notFound('The organization no longer exists', 'ORG_NOT_FOUND');
  }

  /*
   * Idempotency: they may already be a member — added manually, or via a
   * different invite. Adding again would violate the UNIQUE(user_id,
   * organization_id) constraint, so skip it and keep the role they already
   * hold rather than silently regrading them to whatever this invite said.
   */
  const existingMembership = await orgModel.findMembership(user.id, organizationId);
  if (!existingMembership) {
    await orgModel.addOrgMember({ userId: user.id, organizationId, role: invitation.role });
  }

  await orgModel.markInvitationAccepted(invitation.id);

  const role = existingMembership ? existingMembership.role : invitation.role;
  const tokens = await issueTokens(user.id, organizationId, role);

  return {
    user: toSessionUser(user),
    organization: toSessionOrg(organization, role),
    ...tokens,
  };
}

/** Preview an invitation so the UI can show who invited whom, before accepting. */
async function getInvitation(token) {
  const invitation = await loadUsableInvitation(token, 'Invalid or expired invitation token');

  return {
    email: invitation.email,
    organizationName: invitation.organization_name,
    role: invitation.role,
  };
}

module.exports = {
  signup,
  login,
  refresh,
  logout,
  getMe,
  acceptInvitation,
  getInvitation,
  switchOrganization,
};
