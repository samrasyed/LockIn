const app = require('../backend/server');

const runApp = (req, res, url) => {
  req.url = url;
  return app(req, res);
};

module.exports = { runApp };
