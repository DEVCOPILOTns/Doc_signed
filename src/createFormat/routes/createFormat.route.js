const express = require('express');
const { createFormatRender, uploadFormat, getSigners, getFormat, updateFormatData } = require('../controllers/createFormat.controller');
const router = express.Router();

router.get('/signers', getSigners);
router.get('/:id', getFormat);
router.post('/', uploadFormat);
router.put('/:id', updateFormatData);
router.get('/', createFormatRender);

module.exports = router;