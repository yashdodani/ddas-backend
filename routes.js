const express = require('express');
const {
  compare,
  getFile,
  deleteFile,
  fileInfo,
  getAllFiles,
} = require('./controller');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const router = express.Router();

router.get('/compare', compare);
router.get('/file/:id', getFile);
router.get('/file-info/:id', fileInfo);

// testing routes
router.delete('/file/:id', deleteFile);
router.get('/file', getAllFiles);

module.exports = router;
