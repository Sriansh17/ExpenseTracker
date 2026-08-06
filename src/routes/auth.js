const express = require('express');
const controller = require('../controllers/authController');
const { authenticate } = require('../middlewares/authenticate');
const { validateRequest } = require('../middlewares/validateRequest');
const schemas = require('../validation/authSchemas');
const ReqType = require('../constants/reqTypes');

const router = express.Router();
router.post('/register', validateRequest(schemas.register, ReqType.BODY), controller.register);
router.post('/login', validateRequest(schemas.login, ReqType.BODY), controller.login);
router.post('/google', validateRequest(schemas.googleAuth, ReqType.BODY), controller.googleAuth);
router.post('/refresh', validateRequest(schemas.refresh, ReqType.BODY), controller.refresh);
router.post('/logout', authenticate, validateRequest(schemas.refresh.optional(), ReqType.BODY), controller.logout);
router.post('/change-password', authenticate, validateRequest(schemas.changePassword, ReqType.BODY), controller.changePassword);

module.exports = router;
