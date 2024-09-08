const express = require('express');
const morgan = require('morgan');
const router = require('./routes');

const app = express();
app.use(express.json());

app.use(morgan('dev'));

app.get('/', (req, res) => {
  res.send('hello from /home');
});

app.use('/api', router);

const PORT = 8000;
app.listen(PORT, () => {
  console.log(`Server running on ${PORT} `);
});
