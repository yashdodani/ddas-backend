const axios = require('axios');
// const https = require('https');
const http = require('http');
// const checksum = require('checksum');
// const sha256 = require('crypto-js/sha256');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const sampleMetadata = {
  date: 'Sat, 07 Sep 2024 19:47:41 GMT',
  server:
    'Apache/2.4.37 (Red Hat Enterprise Linux) OpenSSL/1.1.1k mod_fcgid/2.3.9 Phusion_Passenger/6.0.23',
  'last-modified': 'Fri, 15 Feb 2013 05:09:52 GMT',
  etag: '"93f7-4d5bc629f0800"',
  'accept-ranges': 'bytes',
  'content-length': '37879',
  connection: 'close',
  'content-type': 'application/pdf',
};

const compareMetadata = async (req, res) => {
  // const agent = new https.Agent({
  //   rejectUnauthorized: false,
  // });

  const url = req.query.url;

  if (!url) {
    return res.status(500).json({ error: 'URL is required' });
  }

  try {
    // const metadata = await axios.get(url, { httpsAgent: agent });
    const metadata = (await axios.get(url)).data;

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

    const chunkSize = 10 * 1024 * 1024;

    http.get(url, (response) => {
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

        // const allFiles = await prisma.file.findMany();
        // console.log(allFiles);

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

const hashChunk = (data) => {
  const hash = crypto.createHash('sha256');
  hash.update(data);
  return hash.digest('hex');
};

const compareContent = async (req, res) => {
  const url = req.query.url;

  const chunkSize = 10 * 1024 * 1024;

  http.get(url, (response) => {
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

      // const allFiles = await prisma.file.findMany();
      // console.log(allFiles);

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
};

module.exports = { compareMetadata, compareContent };
