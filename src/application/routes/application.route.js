const express = require('express');
const router = express.Router();
const {applicationRender, applicationData, applicationDetails } = require('../controllers/application.controller');
// const ensureAuth = require('...') // si usas middleware de auth


router.get('/', applicationRender);


router.get('/data', applicationData);


router.get('/:id', applicationDetails);

module.exports = router;