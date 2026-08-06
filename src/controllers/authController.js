const authService = require('../services/authService');

function sendResult(res, result, defaultMessage = 'OK') {
  const status = result.statusCode || 200;
  return res.status(status).json({ code: status >= 400 ? 'ERROR' : 'OK', message: defaultMessage, ...result });
}

async function register(req, res, next) { try { return sendResult(res, await authService.register(req.body), 'Registration successful'); } catch (e) { next(e); } }
async function login(req, res, next) { try { return sendResult(res, await authService.login(req.body), 'Login successful'); } catch (e) { next(e); } }
async function googleAuth(req, res, next) { try { return sendResult(res, await authService.googleAuth(req.body.idToken), 'Google authentication successful'); } catch (e) { next(e); } }
async function refresh(req, res, next) { try { return sendResult(res, await authService.refreshToken(req.body.refreshToken), 'Token refreshed'); } catch (e) { next(e); } }
async function logout(req, res, next) { try { return sendResult(res, await authService.logout(req.userId, req.body.refreshToken), 'Logged out'); } catch (e) { next(e); } }
async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    return sendResult(res, await authService.changePassword(req.userId, currentPassword, newPassword), 'Password changed');
  } catch (e) { next(e); }
}

module.exports = { register, login, googleAuth, refresh, logout, changePassword };
