const express = require('express');
const controller = require('../controllers/merchantController');
const { authenticate } = require('../middlewares/authenticate');
const { validateRequest } = require('../middlewares/validateRequest');
const schemas = require('../validation/merchantSchemas');
const ReqType = require('../constants/reqTypes');

const router = express.Router();

router.use(authenticate);

// GET /api/merchants/lookup?name=Swiggy — find category for merchant
router.get('/lookup', validateRequest(schemas.lookupQuery, ReqType.QUERY), controller.lookup);

// GET /api/merchants — list all merchant mappings
router.get('/', controller.list);

// POST /api/merchants — create/update merchant → category mapping
router.post('/', validateRequest(schemas.upsertMerchant, ReqType.BODY), controller.upsert);

// DELETE /api/merchants/:name — remove a user-specific mapping
router.delete('/:name', controller.delete);

module.exports = router;
