const app = require('../backend/app');

module.exports = (req, res) => {
  return new Promise((resolve, reject) => {
    res.on('finish', resolve);
    res.on('error', reject);
    app(req, res, (err) => {
      if (err && !res.headersSent) {
        res.status(500).json({ error: err.message });
      }
      resolve();
    });
  });
};
