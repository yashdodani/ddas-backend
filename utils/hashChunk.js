const crypto = require('crypto');

const hashChunk = (data) => {
  const hash = crypto.createHash('sha256');
  hash.update(data);
  return hash.digest('hex');
};

module.exports = hashChunk;
