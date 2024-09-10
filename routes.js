const express = require('express');
const { compare, getFile } = require('./controller');

const router = express.Router();

// router.get('/compareMetadata', compareMetadata);
router.get('/compare', compare);
router.get('/file/:id', getFile);

// router.get('/compareContent', compareContent);

module.exports = router;
