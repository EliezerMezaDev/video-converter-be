const express = require('express');
const router = express.Router();
const upload = require('./audio-noise-remover.middleware');
const controller = require('./audio-noise-remover.controller');

router.post('/upload', upload.array('audios'), controller.upload);
router.get('/download/:filename', controller.download);

module.exports = router;
