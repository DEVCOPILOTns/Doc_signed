const express = require('express');
const router = express.Router();
const fileUploadMiddleware = require('../middleware/fileUpload.middleware.js');
const { uploadSign} = require('../controllers/userProfile.controller.js');
const { userProfileRender } = require('../controllers/userProfile.controller');

router.get('/', userProfileRender);
router.post('/upload-signature', fileUploadMiddleware, uploadSign);

module.exports = router;