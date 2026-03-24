const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const userModel = require('../models/user.model');
const orgModel = require('../models/org.model');
const tokenModel = require('../models/token.model');
const workspaceModel = require('../models/workspace.model');

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

  try {
    const user = await userModel.createUser({ name, email, passwordHash });

    const slug = generateSlug(orgName);
    const organization = await orgModel.createOrganization({
      name: orgName,
      slug,
      createdBy: user.id,
    });

    await orgModel.addOrgMember({
      userId: user.id,
      organizationId: organization.id,
      role: 'admin',
    });

    await workspaceModel.createWorkspace({
      organizationId: organization.id,
      name: 'General',
      createdBy: user.id,
    });

    const tokens = await issueTokens(user.id, organization.id, 'admin');

    return {
      user: { id: user.id, name: user.name, email: user.email },
      organization: { id: organization.id, name: organization.name, slug: organization.slug },
      ...tokens,
    };
  } catch (err) {
    err.statusCode = err.statusCode || 500;
    err.code = err.code || 'SIGNUP_FAILED';
    throw err;
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
    organization: { id: membership.id, name: membership.name, slug: membership.slug },
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

module.exports = { signup, login, refresh, logout, getMe };
