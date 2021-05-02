const router = require('express').Router();
const controllerhubspot = require('../controllers/hubspot.controller.js');
const controllerJasmin = require('../controllers/jasmin.controller');
const controllerAuxJasmin = require('../controllers/jasminAux.controller');

//hubspot
router.post('/Hubspot/hubspot/', controllerhubspot.createClient);
router.post('Hubspot/update', controllerhubspot.updateClient);
router.post('Hubspot/create', controllerhubspot.createTicket);
router.get('/Hubspot/getClient/:email', controllerhubspot.getClient);

//jasmin
router.get('/Jasmin/getProductsFromJasmin', controllerJasmin.getProductsFromJasmin);
router.post('/Jasmin/makeOrder', controllerJasmin.makeOrder);

module.exports = router;