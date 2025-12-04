const express = require('express');
const { createFormatRender } = require('../controllers/createFormat.controller');
const router = express.Router();

router.get('/', createFormatRender);


module.exports = router;