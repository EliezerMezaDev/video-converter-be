const express = require('express');
const router = express.Router();
const controller = require('./music-search.controller');

router.get('/search',       controller.search);
router.get('/preview/:id',  controller.preview);

module.exports = router;
