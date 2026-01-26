const express = require('express');
const { createFormatRender, uploadFormat, getSigners, getFormat, updateFormatData, disableFormat, activateFormat} = require('../controllers/createFormat.controller');
const router = express.Router();

router.get('/signers', getSigners);
router.get('/:id', getFormat);
router.post('/', uploadFormat);
router.put('/:id', updateFormatData);
router.put('/disable/:id', disableFormat);
router.get('/', createFormatRender);
router.put('/activate/:id', activateFormat);

module.exports = router;