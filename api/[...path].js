const app = require('../backend/server');

module.exports = (req, res) => {
  if (req.url.startsWith('/api/debug')) {
    return res.json({
      url: req.url,
      method: req.method,
      hasMongoUri: Boolean(process.env.MONGODB_URI || process.env.MONGO_URI),
      hasJwtSecret: Boolean(process.env.JWT_SECRET)
    });
  }

  return app(req, res);
};
