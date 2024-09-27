const https = require("node:https");
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const agent = require("../agent");
const hashChunk = require("./hashChunk");
const { io } = require("../socket");

let prevTime = Date.now();
function downloadFileWithHash(url, METADATA, METADATAHASH) {
  prevTime = Date.now();
  return new Promise((resolve) => {
    // 1. create a file with same name as headers
    const splitPath = METADATA.path.split("/");
    const filesize = METADATA.size;
    const filename = splitPath[splitPath.length - 1];
    const filePath = path.join(process.cwd(), "datasets", filename);
    // console.log({ METADATAHASH, filesize, filename });

    fs.open(filePath, "w", function (err, file) {
      if (err) {
        console.log("ERROR creating new file.");
      }
    });

    // 2. start getting file from the internet
    // emit event 'download_progress' and send data to client
    let chunkSize;
    if (filesize <= 2 * 1024 * 1024) {
      chunkSize = filesize;
    }
    chunkSize = 2 * 1024 * 1024; // 2mb

    https.get(url, { agent }, (response) => {
      let data = Buffer.alloc(0);

      console.log(`DOWNLOADING FROM INTERNET, URL: ${url}`);
      let totalDownloaded = 0;

      response.on("data", (chunk) => {
        if (data.length <= chunkSize) {
          data = Buffer.concat([data, chunk]);
        }
        totalDownloaded += chunk.length;

        // append to file
        fs.appendFile(filePath, chunk, function (err) {
          if (err) throw err;
        });

        const progress = Math.round((totalDownloaded / filesize) * 100);

        // send event
        if (Date.now() - prevTime >= 1000) {
          io.emit("download_progress", {
            fileName: filename,
            fileSize: Number(filesize),
            downloadedLength: totalDownloaded,
            progress,
          });
          console.log({
            fileName: filename,
            fileSize: Number(filesize),
            downloadedLength: totalDownloaded,
            progress,
            now: Date.now() / (1000 * 1000),
          });
          prevTime = Date.now();
        }
      });

      response.on("end", async () => {
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
