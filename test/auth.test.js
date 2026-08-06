const test = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://localhost/expense_tracker_test';
process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long';
process.env.GCS_BUCKET = 'expense-tracker-test';

const jwt = require('jsonwebtoken');
const authSchemas = require('../src/validation/authSchemas');
const { generateAccessToken } = require('../src/services/authService');

test('password validation accepts only passwords meeting all requirements', () => {
  const valid = ['Secure1!x', 'A-longer_password9'];
  const invalid = ['short1!', 'lowercase1!', 'UPPERCASE1!', 'NoDigits!!', 'NoSpecial1', 'a'.repeat(73)];
  for (const password of valid) assert.equal(authSchemas.register.validate({ email: 'a@example.com', password }).error, undefined);
  for (const password of invalid) assert.notEqual(authSchemas.register.validate({ email: 'a@example.com', password }).error, undefined);
});

test('access token contains userId and expires exactly 15 minutes after issuance', () => {
  const issuedAt = 1_800_000_000;
  const token = generateAccessToken('user-123', issuedAt);
  const claims = jwt.decode(token);
  assert.equal(claims.userId, 'user-123');
  assert.equal(claims.iat, issuedAt);
  assert.equal(claims.exp, issuedAt + 15 * 60);
});
