const express = require('express');
const router = express.Router();
const {applicationRender, applicationData, applicationDetails, downloadAllApplicationDocuments } = require('../controllers/application.controller');
// const ensureAuth = require('...') // si usas middleware de auth


router.get('/', applicationRender);


router.get('/data', applicationData);

router.get('/download-all/:idSolicitud', downloadAllApplicationDocuments);

router.get('/:id', applicationDetails);

module.exports = router;