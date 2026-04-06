const express = require('express');
const router = express.Router();
const upload = require('./video-format-converter.middleware');
const controller = require('./video-format-converter.controller');

router.post('/upload', upload.array('videos'), controller.upload);
router.get('/download/:filename', controller.download);

module.exports = router;
