const express = require('express');
const { compare } = require('./controller');

const router = express.Router();

// router.get('/compareMetadata', compareMetadata);
router.get('/compare', compare);

// router.get('/compareContent', compareContent);

module.exports = router;
