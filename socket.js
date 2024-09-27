const { createServer } = require("node:http");
const { Server } = require("socket.io");

const socketServer = createServer();
const io = new Server(socketServer, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  console.log("a user connected");
  io.emit("hello", { some: "value" });

  // watch for change, emit events
  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});
socketServer.listen(4000);

module.exports = { io };
