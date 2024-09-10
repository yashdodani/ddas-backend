const express = require('express');
const { createServer } = require('node:http');
const morgan = require('morgan');
const { Server } = require('socket.io');
const router = require('./routes');

const app = express();
const server = createServer(app);

app.use(express.json());

app.use(morgan('dev'));

app.get('/', (req, res) => {
  res.send('hello from /home');
});

app.use('/api', router);

const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173'],
  },
});

io.on('connection', (socket) => {
  console.log('a user connected');

  // watch for change, emit events
  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

const PORT = 8000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT} `);
});

module.exports = io;
