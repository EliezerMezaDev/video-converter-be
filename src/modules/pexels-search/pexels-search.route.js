const express = require('express');
const router = express.Router();
const controller = require('./pexels-search.controller');

router.get('/search', controller.search);

module.exports = router;
