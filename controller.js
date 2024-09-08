const axios = require('axios');
// const https = require('https');
const http = require('http');
// const checksum = require('checksum');
// const sha256 = require('crypto-js/sha256');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const metadataUrl = 'http://localhost:8001/api/metadata';
const fileUrl = 'http://localhost:8001/api/file';

const hashChunk = (data) => {
  const hash = crypto.createHash('sha256');
  hash.update(data);
  return hash.digest('hex');
};

const compare = async (req, res) => {
  // const agent = new https.Agent({
  //   rejectUnauthorized: false,
  // });

  const allFiles = await prisma.file.findMany();
  console.log(allFiles);

  const url = req.query.url;

  if (!url) {
    return res.status(500).json({ error: 'URL is required' });
  }

  try {
    // const metadata = await axios.get(url, { httpsAgent: agent });
    const metadata = (await axios.get(metadataUrl)).data;

    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(metadata));
    const mdHash = hash.digest('hex');
    console.log(mdHash);

    // compare this hash with hashes in the db.
    const foundFiles = await prisma.file.findMany({
      where: { metadataHash: mdHash },
    });

    if (foundFiles.length === 0) {
      return res.json({
        numberOfFilesFound: 0,
      });
    }

    const chunkSize = 10 * 1024 * 1024; // 10mb

    http.get(fileUrl, (response) => {
      let data = Buffer.alloc(0);

      response.on('data', (chunk) => {
        // collect data until we reach size
        if (data.length < chunkSize) {
          data = Buffer.concat([data, chunk]);
        }
      });

      response.on('end', async () => {
        // hash the collected chunk
        const hash = hashChunk(data);
        console.log('hash: ', hash);

        const matchedFile = await prisma.file.findUnique({
          where: { contentHash: hash },
        });

        if (!matchedFile) {
          res.json({
            fileFound: false,
            objectId: null,
          });
        } else {
          res.json({
            fileFound: true,
            objectId: matchedFile.id,
          });
        }
      });
    });
  } catch (err) {
    console.log(err);
  }
};

module.exports = { compare };
