const https = require('node:https');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const agent = require('../agent');
const hashChunk = require('./hashChunk');

function downloadFileWithHash(url, METADATA, METADATAHASH) {
  return new Promise((resolve) => {
    // 1. create a file with same name as headers
    const splitPath = METADATA.path.split('/');
    const filesize = METADATA['content-length'];
    const filename = splitPath[splitPath.length - 1];
    const filePath = path.join(process.cwd(), 'datasets', filename);

    fs.open(filePath, 'w', function (err, file) {
      if (err) throw err;
      console.log(`Created with hash ${filename}`);
    });

    // 2. start getting file from the internet
    // emit event 'download_progress' and send data to client
    let chunkSize;
    if (METADATA['content-length'] <= 10485760) {
      chunkSize = Number(METADATA['content-length']);
    }
    chunkSize = 10 * 1024 * 1024; // 10mb

    https.get(url, { agent }, (response) => {
      let data = Buffer.alloc(0);

      console.log(`Starting download from ${url}`);
      let totalDownloaded = 0;

      response.on('data', (chunk) => {
        if (data.length <= chunkSize) {
          data = Buffer.concat([data, chunk]);
        }
        totalDownloaded += chunk.length;

        // append to file
        fs.appendFile(filePath, chunk, function (err) {
          if (err) throw err;
        });

        const progress = Math.round(totalDownloaded / filesize) * 100;

        // send event
        io.emit('download_progress', { dataLength, progress, filesize });
      });

      response.on('end', async () => {
        data = data.slice(0, chunkSize);
        const hash = hashChunk(data);

        // get filepath of downloaded file
        // create prisma document
        const file = await prisma.file.create({
          data: {
            title: filename,
            metadataHash: METADATAHASH,
            contentHash: hash,
            filePath: `/datasets/${filename}`,
          },
        });

        // provide the id to the user
        resolve(file.id);
      });
    });
  });
}

module.exports = downloadFileWithHash;
