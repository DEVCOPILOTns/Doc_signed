const express = require('express');
const { createFormatRender, uploadFormat, getSigners } = require('../controllers/createFormat.controller');
const router = express.Router();

router.get('/', createFormatRender);
router.get('/signers', getSigners);
router.post('/', uploadFormat);

module.exports = router;