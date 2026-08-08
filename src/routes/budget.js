const express = require('express');
const controller = require('../controllers/budgetController');
const { authenticate } = require('../middlewares/authenticate');
const router = express.Router();
router.use(authenticate);
router.get('/', controller.get);
router.put('/', controller.update);
module.exports = router;
