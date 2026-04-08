const express = require('express');
const router = express.Router();
const controller = require('./pixabay-search.controller');

router.get('/search', controller.search);

module.exports = router;
