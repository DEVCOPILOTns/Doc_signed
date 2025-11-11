const express = require('express');
const router = express.Router();
const { applicationRender, applicationData, applicationDetails } = require('../controllers/application.controller');

router.get('/', applicationRender);
router.get('/api/applications', applicationData);
router.get('/api/applications/:id', applicationDetails);

module.exports = router;