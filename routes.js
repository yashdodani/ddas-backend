const express = require('express');
const { compareMetadata, compareContent } = require('./controller');

const router = express.Router();

// router.get('/compareMetadata', compareMetadata);
router.get('/compareMetadata', compareMetadata);

router.get('/compareContent', compareContent);

module.exports = router;
