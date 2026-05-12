module.exports = (req, res) => {
  res.json({
    url: req.url,
    method: req.method,
    hasMongoUri: Boolean(process.env.MONGODB_URI || process.env.MONGO_URI),
    hasJwtSecret: Boolean(process.env.JWT_SECRET)
  });
};
