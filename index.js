const express = require("express");
var cors = require("cors");
const { createServer } = require("node:http");
const morgan = require("morgan");
const router = require("./routes");
require("./socket");

const app = express();
const server = createServer(app);

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/", (req, res) => {
  res.send("hello from /home");
});

app.use("/api", router);

const PORT = 8000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT} `);
});
