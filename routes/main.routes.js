const router = require('express').Router();
const controllerhubspot = require('../controllers/hubspot.controller.js');

router.post('/hubspot/', controllerhubspot.createClient);
router.post('/hubspot/update', controllerhubspot.updateClient);
router.post('/hubspot/create', controllerhubspot.createTicket);

module.exports = router;