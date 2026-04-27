const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getClient } = require('../config/db');
const env = require('../config/env');
const userModel = require('../models/user.model');
const orgModel = require('../models/org.model');
const tokenModel = require('../models/token.model');
const workspaceModel = require('../models/workspace.model');

const SAFE_USER_FIELDS = 'id, name, email, avatar_url, is_verified, created_at, updated_at';

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateSlug(name) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const suffix = crypto.randomBytes(2).toString('hex');
  return `${base}-${suffix}`;
}

function generateAccessToken(payload) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '15m' });
}

async function issueTokens(userId, orgId, role) {
  const accessToken = generateAccessToken({ userId, orgId, role });

  const refreshToken = crypto.randomUUID();
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await tokenModel.createRefreshToken({ userId, tokenHash, expiresAt });

  return { accessToken, refreshToken };
}

// ─── SIGNUP ───────────────────────────────────────────────

async function signup({ name, email, password, orgName }) {
  const existing = await userModel.findUserByEmail(email);
  if (existing) {
    const err = new Error('Email already registered');
    err.statusCode = 409;
    err.code = 'EMAIL_EXISTS';
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // 1. Create User
    const userResult = await client.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING ${SAFE_USER_FIELDS}`,
      [name, email, passwordHash]
    );
    const user = userResult.rows[0];

    // 2. Create Organization
    const slug = generateSlug(orgName);
    const orgResult = await client.query(
      `INSERT INTO organizations (name, slug, created_by)
       VALUES ($1, $2, $3)
       RETURNING id, name, slug, created_by, created_at`,
      [orgName, slug, user.id]
    );
    const organization = orgResult.rows[0];

    // 3. Add Member
    await client.query(
      `INSERT INTO organization_members (user_id, organization_id, role)
       VALUES ($1, $2, $3)`,
      [user.id, organization.id, 'admin']
    );

    // 4. Create Workspace
    await client.query(
      `INSERT INTO workspaces (organization_id, name, created_by)
       VALUES ($1, $2, $3)`,
      [organization.id, 'General', user.id]
    );

    await client.query('COMMIT');

    const tokens = await issueTokens(user.id, organization.id, 'admin');

    return {
      user: { id: user.id, name: user.name, email: user.email },
      organization: { id: organization.id, name: organization.name, slug: organization.slug, role: 'admin' },
      ...tokens,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    err.statusCode = err.statusCode || 500;
    err.code = err.code || 'SIGNUP_FAILED';
    throw err;
  } finally {
    client.release();
  }
}

// ─── LOGIN ────────────────────────────────────────────────

async function login({ email, password }) {
  const user = await userModel.findUserByEmail(email);
  if (!user) {
    const err = new Error('Invalid credentials');
    err.statusCode = 401;
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    const err = new Error('Invalid credentials');
    err.statusCode = 401;
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  const orgs = await orgModel.findOrgsByUserId(user.id);
  if (!orgs.length) {
    const err = new Error('No organization found for user');
    err.statusCode = 404;
    err.code = 'NO_ORG';
    throw err;
  }
  const membership = orgs[0];

  const tokens = await issueTokens(user.id, membership.id, membership.role);

  return {
    user: { id: user.id, name: user.name, email: user.email },
    organization: { id: membership.id, name: membership.name, slug: membership.slug, role: membership.role },
    ...tokens,
  };
}

// ─── REFRESH ──────────────────────────────────────────────
// Token reuse detection: if token is already revoked
// and someone tries to use it, this could indicate
// token theft. In production: revoke ALL user tokens here.

async function refresh({ refreshToken }) {
  const tokenHash = hashToken(refreshToken);
  const stored = await tokenModel.findTokenByHash(tokenHash);

  if (!stored) {
    const err = new Error('Refresh token not found');
    err.statusCode = 401;
    err.code = 'TOKEN_NOT_FOUND';
    throw err;
  }

  if (stored.revoked_at) {
    console.error(`⚠️  TOKEN REUSE DETECTED for user ${stored.user_id} — revoking all tokens`);
    await tokenModel.revokeAllUserTokens(stored.user_id);
    const err = new Error('Token reuse detected — all sessions revoked');
    err.statusCode = 401;
    err.code = 'TOKEN_REVOKED';
    throw err;
  }

  if (new Date(stored.expires_at) < new Date()) {
    await tokenModel.revokeTokenById(stored.id);
    const err = new Error('Refresh token expired');
    err.statusCode = 401;
    err.code = 'TOKEN_EXPIRED';
    throw err;
  }

  const user = await userModel.findUserById(stored.user_id);
  if (!user) {
    await tokenModel.revokeTokenById(stored.id);
    const err = new Error('User not found');
    err.statusCode = 401;
    err.code = 'USER_NOT_FOUND';
    throw err;
  }

  const orgs = await orgModel.findOrgsByUserId(stored.user_id);
  const membership = orgs[0] || null;

  await tokenModel.revokeTokenById(stored.id);

  const tokens = await issueTokens(
    stored.user_id,
    membership ? membership.id : null,
    membership ? membership.role : 'member'
  );

  return tokens;
}

// ─── LOGOUT ───────────────────────────────────────────────

async function logout({ refreshToken }) {
  const tokenHash = hashToken(refreshToken);
  const stored = await tokenModel.findTokenByHash(tokenHash);

  if (stored) {
    await tokenModel.revokeTokenById(stored.id);
  }
}

// ─── GET ME ───────────────────────────────────────────────

async function getMe(userId) {
  const user = await userModel.findUserById(userId);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const organizations = await orgModel.findOrgsByUserId(userId);

  return {
    user: { id: user.id, name: user.name, email: user.email, avatar_url: user.avatar_url, created_at: user.created_at },
    organizations,
  };
}

async function switchOrganization({ userId, orgId }) {
  const membership = await orgModel.findMembership(userId, orgId);
  if (!membership) {
    const err = new Error('You are not a member of this organization');
    err.statusCode = 403;
    err.code = 'NOT_MEMBER';
    throw err;
  }

  const org = await orgModel.findOrgById(orgId);
  const tokens = await issueTokens(userId, orgId, membership.role);

  return {
    organization: { id: org.id, name: org.name, slug: org.slug, role: membership.role },
    ...tokens,
  };
}

async function acceptInvitation({ token, name, password }) {
  const invitation = await orgModel.findInvitationByToken(token);

  if (!invitation) {
    const err = new Error('Invalid invitation link');
    err.statusCode = 404;
    err.code = 'INVITATION_NOT_FOUND';
    throw err;
  }

  // Already accepted?
  if (invitation.accepted_at) {
    const err = new Error('This invitation has already been accepted');
    err.statusCode = 400;
    err.code = 'INVITATION_ALREADY_ACCEPTED';
    throw err;
  }

  // Expired?
  if (new Date(invitation.expires_at) < new Date()) {
    const err = new Error('This invitation has expired');
    err.statusCode = 400;
    err.code = 'INVITATION_EXPIRED';
    throw err;
  }

  const normalizedEmail = invitation.email.toLowerCase();
  let user = await userModel.findUserByEmail(normalizedEmail);

  if (!user) {
    // New user signup via invitation
    if (!name || !password) {
      const err = new Error('Full Name and Password are required');
      err.statusCode = 400;
      err.code = 'CREDENTIALS_REQUIRED';
      throw err;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    user = await userModel.createUser({ name, email: normalizedEmail, passwordHash });
  }

  const organizationId = invitation.organization_id;
  const organization = await orgModel.findOrgById(organizationId);
  if (!organization) {
    const err = new Error('The organization no longer exists');
    err.statusCode = 404;
    err.code = 'ORG_NOT_FOUND';
    throw err;
  }

  // Idempotency: Check if they are already a member (could have joined via another invite or added manually)
  const existingMembership = await orgModel.findMembership(user.id, organizationId);
  
  if (!existingMembership) {
    await orgModel.addOrgMember({
      userId: user.id,
      organizationId,
      role: invitation.role,
    });
  }

  // Mark this specific invitation as used
  await orgModel.markInvitationAccepted(invitation.id);

  // Success - issue tokens for the joined organization
  const role = existingMembership ? existingMembership.role : invitation.role;
  const tokens = await issueTokens(user.id, organizationId, role);

  return {
    user: { id: user.id, name: user.name, email: user.email },
    organization: { id: organization.id, name: organization.name, slug: organization.slug, role },
    ...tokens,
  };
}

async function getInvitation(token) {
  const invitation = await orgModel.findInvitationByToken(token);

  if (!invitation) {
    const err = new Error('Invalid or expired invitation token');
    err.statusCode = 404;
    err.code = 'INVITATION_NOT_FOUND';
    throw err;
  }

  if (invitation.accepted_at) {
    const err = new Error('This invitation has already been accepted');
    err.statusCode = 400;
    err.code = 'INVITATION_ALREADY_ACCEPTED';
    throw err;
  }

  if (new Date(invitation.expires_at) < new Date()) {
    const err = new Error('This invitation has expired');
    err.statusCode = 400;
    err.code = 'INVITATION_EXPIRED';
    throw err;
  }

  return {
    email: invitation.email,
    organizationName: invitation.organization_name,
    role: invitation.role,
  };
}

module.exports = { signup, login, refresh, logout, getMe, acceptInvitation, getInvitation, switchOrganization };
