const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const crypto = require("crypto");
const axios = require("axios");
const https = require("https");
const path = require("path");
const downloadFile = require("./utils/downloadFile");
const downloadFileWithHash = require("./utils/downloadFileWithHash");
const agent = require("./agent");
const hashChunk = require("./utils/hashChunk");
const { io } = require("./socket");

let METADATA;
let METADATAHASH;
let CONTENTHASH;

const compareMetadata = async (url) => {
  let headersFull = await axios.head(url, { httpsAgent: agent });
  let headers = headersFull.headers;
  let metadata = {
    size: headers["content-length"],
    path: headersFull.request.path,
  };

  // console.log(metadata);
  METADATA = metadata;

  const hash = crypto.createHash("sha256");
  hash.update(JSON.stringify(metadata));
  const mdHash = hash.digest("hex");
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
      console.log("Getting chunks to hash...");
      let data = Buffer.alloc(0);

      response.on("data", (chunk) => {
        if (data.length <= chunkSize) {
          data = Buffer.concat([data, chunk]);
        }
      });

      response.on("end", async () => {
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
    return res.status(500).json({ error: "URL is required" });
  }

  try {
    const foundFiles = await compareMetadata(url);

    if (foundFiles.length === 0) {
      // download from the internet
      const objectId = await downloadFileWithHash(url, METADATA, METADATAHASH);

      console.log("new file created with hash", objectId);

      return res.json({
        matchFound: false,
        id: objectId,
      });
    }

    console.log("METADATA matched, comparing content now...");

    const matchedFile = await compareContent(url);

    if (!matchedFile) {
      // download from internet
      const objectId = await downloadFile(
        url,
        METADATA,
        METADATAHASH,
        CONTENTHASH,
      );

      console.log("File downloaded", objectId);

      return res.json({
        matchFound: false,
        id: objectId,
      });
    } else {
      return res.json({
        matchFound: true,
        id: matchedFile.id,
      });
    }
  } catch (err) {
    console.log(err);
  }
};

async function getFile() {
  const id = req.params.id;

  // get filePath from prisma
  const fileInDb = await prisma.file.findUnique({
    where: { id },
  });

  if (!fileInDb) {
    res.json({
      message: "Incorrect ID",
    });
  }

  // using filePath, stream the file to client
  const filePath = fileInDb.filePath;

  const fileSize = fs.statSync(path.join(process.cwd(), filePath));

  const stream = fs.createReadStream(path.join(process.cwd(), filePath));
  let totalSent = 0;

  stream.on("data", (chunk) => {
    totalSent += chunk.length;

    let progress = Math.round(totalSent / fileSize) * 100;
    io.emit("copy_progress", { totalSent, progress });
  });

  stream.on("end", () => {
    res.end();
  });

  stream.on("error", (err) => {
    console.error(err);
    res.status(500).json({
      message: "Error downloading file",
    });
  });
}

module.exports = { compare, getFile };
