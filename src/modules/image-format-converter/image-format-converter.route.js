const express = require('express');
const router = express.Router();
const upload = require('./image-format-converter.middleware');
const controller = require('./image-format-converter.controller');

router.post('/upload', upload.array('images'), controller.upload);
router.get('/download/:filename', controller.download);

module.exports = router;
