const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { env } = require('../config/env');
const userQueries = require('../queries/userQueries');
const refreshTokenQueries = require('../queries/refreshTokenQueries');
const loginAttemptQueries = require('../queries/loginAttemptQueries');
const { hash, compare } = require('../utils/hasher');
const AppError = require('../utils/appError');

const ACCESS_TOKEN_SECONDS = 15 * 60;
const REFRESH_TOKEN_DAYS = 7;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const googleClient = new OAuth2Client();

function publicUser(user) {
  if (!user) return user;
  const { password_hash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateAccessToken(userId, now = Math.floor(Date.now() / 1000)) {
  return jwt.sign({ userId, iat: now }, env.jwtSecret, { expiresIn: ACCESS_TOKEN_SECONDS });
}

async function issueTokenPair(userId) {
  const accessToken = generateAccessToken(userId);
  const refreshToken = crypto.randomBytes(48).toString('base64url');
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);
  await refreshTokenQueries.create(userId, hashRefreshToken(refreshToken), expiresAt);
  return { accessToken, refreshToken, expiresIn: ACCESS_TOKEN_SECONDS };
}

async function register({ email, password, displayName }) {
  if (await userQueries.findByEmail(email)) throw new AppError('EMAIL_EXISTS', 'Email is already registered', 409);
  const user = await userQueries.create({ email, passwordHash: await hash(password), displayName });
  return { user: publicUser(user), tokens: await issueTokenPair(user.id), statusCode: 201 };
}

async function login({ email, password }) {
  const attempt = await loginAttemptQueries.findByEmail(email);
  if (attempt?.locked_until && new Date(attempt.locked_until) > new Date()) {
    throw new AppError('ACCOUNT_LOCKED', 'Too many failed attempts; try again later', 423);
  }

  const user = await userQueries.findByEmail(email);
  const valid = user?.password_hash ? await compare(password, user.password_hash) : false;
  if (!valid) {
    const count = (attempt?.attempt_count || 0) + 1;
    const lockedUntil = count >= MAX_LOGIN_ATTEMPTS
      ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000) : null;
    await loginAttemptQueries.upsert(email, count, lockedUntil);
    throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
  }

  await loginAttemptQueries.reset(email);
  return { user: publicUser(user), tokens: await issueTokenPair(user.id) };
}

async function googleAuth(idToken) {
  let ticket;
  try {
    ticket = await Promise.race([
      googleClient.verifyIdToken({ idToken, audience: '572173811299-ifkt5btc3884a2klb0n2gpamfinenhh8.apps.googleusercontent.com' }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Google verification timeout')), 10000))
    ]);
  } catch (_error) {
    throw new AppError('INVALID_GOOGLE_TOKEN', 'Unable to verify Google token', 401);
  }
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) throw new AppError('INVALID_GOOGLE_TOKEN', 'Google token is missing required claims', 401);

  let user = await userQueries.findByGoogleSub(payload.sub);
  let statusCode = 200;
  if (!user) {
    const existingEmail = await userQueries.findByEmail(payload.email);
    if (existingEmail && !existingEmail.google_sub) {
      throw new AppError('EMAIL_CONFLICT', 'An account already exists for this email', 409);
    }
    user = await userQueries.create({
      email: payload.email, googleSub: payload.sub,
      displayName: payload.name, avatarUrl: payload.picture
    });
    statusCode = 201;
  }
  return { user: publicUser(user), tokens: await issueTokenPair(user.id), statusCode };
}

async function refreshToken(refreshToken) {
  const record = await refreshTokenQueries.findByHash(hashRefreshToken(refreshToken));
  if (!record) throw new AppError('INVALID_REFRESH_TOKEN', 'Invalid or expired refresh token', 401);
  await refreshTokenQueries.invalidate(record.id);
  return { tokens: await issueTokenPair(record.user_id) };
}

async function logout(userId, refreshToken) {
  if (refreshToken) {
    const record = await refreshTokenQueries.findByHash(hashRefreshToken(refreshToken));
    if (record) await refreshTokenQueries.invalidate(record.id);
  } else await refreshTokenQueries.invalidateAllForUser(userId);
  return { loggedOut: true };
}

async function changePassword(userId, currentPassword, newPassword) {
  const user = await userQueries.findById(userId);
  if (!user || !user.password_hash || !(await compare(currentPassword, user.password_hash))) {
    throw new AppError('INVALID_CREDENTIALS', 'Current password is incorrect', 401);
  }
  await userQueries.updatePassword(userId, await hash(newPassword));
  await refreshTokenQueries.invalidateAllForUser(userId);
  return { changed: true };
}

function verifyAccessToken(token) {
  try { return jwt.verify(token, env.jwtSecret); }
  catch (_error) { throw new AppError('UNAUTHORIZED', 'Invalid or expired token', 401); }
}

module.exports = {
  register, login, googleAuth, refreshToken, logout, changePassword,
  generateAccessToken, verifyAccessToken, hashRefreshToken
};
