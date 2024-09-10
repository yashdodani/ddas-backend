const https = require('node:https');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const agent = require('../agent');

function downloadFile(url, METADATA, METADATAHASH, CONTENTHASH) {
  return new Promise((resolve) => {
    // 1. create a file with same name as headers
    const splitPath = METADATA.path.split('/');
    const filesize = METADATA['content-length'];
    const filename = splitPath[splitPath.length - 1];
    const filePath = path.join(process.cwd(), 'datasets', filename);

    fs.open(filePath, 'w', function (err, file) {
      if (err) throw err;
      console.log(`Created without hash ${filename}`);
    });

    // 2. start getting file from the internet
    // emit event 'download_progress' and send data to client

    https.get(url, { agent }, (response) => {
      console.log(`Starting download from ${url}`);
      let totalDownloaded = 0;
      response.on('data', (chunk) => {
        totalDownloaded += chunk.length;

        // append to file
        fs.appendFile(filePath, chunk, function (err) {
          if (err) throw err;
        });

        const progress = Math.round(totalDownloaded / filesize) * 100;
        // send event
        io.emit('download_progress', { totalDownloaded, progress, filesize });
      });

      response.on('end', async () => {
        // get filepath of downloaded file
        // create prisma document
        const file = await prisma.file.create({
          data: {
            title: filename,
            metadataHash: METADATAHASH,
            contentHash: CONTENTHASH ? CONTENTHASH : '',
            filePath: filePath,
          },
        });

        // provide the id to the user
        resolve(file.id);
      });
    });
  });
}

module.exports = downloadFile;
