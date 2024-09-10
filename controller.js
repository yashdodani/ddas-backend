const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');
const axios = require('axios');
const https = require('https');
const path = require('path');
const downloadFile = require('./utils/downloadFile');
const downloadFileWithHash = require('./utils/downloadFileWithHash');
const agent = require('./agent');
const hashChunk = require('./utils/hashChunk');

let METADATA;
let METADATAHASH;
let CONTENTHASH;

const compareMetadata = async (url) => {
  let headersFull = await axios.head(url, { httpsAgent: agent });
  let headers = headersFull.headers;
  let metadata = {
    size: headers['content-length'],
    path: headersFull.request.path,
  };

  // console.log(metadata);
  METADATA = metadata;

  const hash = crypto.createHash('sha256');
  hash.update(JSON.stringify(metadata));
  const mdHash = hash.digest('hex');
  METADATAHASH = mdHash;

  // compare this hash with hashes in the db.
  const foundFiles = await prisma.file.findMany({
    where: { metadataHash: mdHash },
  });

  if (foundFiles.length === 0) {
    return [];
  }
  return foundFiles;
};

const compareContent = (url) => {
  return new Promise((resolve) => {
    const chunkSize = 10 * 1024 * 1024; // 10mb

    https.get(url, { agent: agent }, (response) => {
      console.log('Getting chunks to hash...');
      let data = Buffer.alloc(0);

      response.on('data', (chunk) => {
        if (data.length <= chunkSize) {
          data = Buffer.concat([data, chunk]);
        }
      });

      response.on('end', async () => {
        data = data.slice(0, chunkSize);

        const hash = hashChunk(data);
        CONTENTHASH = hash;

        const matchedFile = await prisma.file.findUnique({
          where: { contentHash: hash },
        });

        if (!matchedFile) {
          resolve(null);
        }

        resolve(matchedFile);
      });
    });
  });
};

const compare = async (req, res) => {
  const url = req.query.url;

  if (!url) {
    return res.status(500).json({ error: 'URL is required' });
  }

  try {
    const foundFiles = await compareMetadata(url);

    if (foundFiles.length === 0) {
      // download from the internet
      const objectId = await downloadFileWithHash(url, METADATA, METADATAHASH);

      console.log('new file created with hash', objectId);

      return res.json({
        matchFound: false,
        id: objectId,
      });
    }

    console.log('METADATA matched, comparing content now...');

    const matchedFile = await compareContent(url);
    console.log(matchedFile);

    if (!matchedFile) {
      // download from internet
      const objectId = await downloadFile(
        url,
        METADATA,
        METADATAHASH,
        CONTENTHASH
      );

      console.log('file already existed', objectId);

      return res.json({
        matchFound: false,
        id: objectId,
      });
    } else {
      res.sendFile(path.join(process.cwd(), matchedFile.filePath));
    }
  } catch (err) {
    console.log(err);
  }
};

module.exports = { compare };
