const app = require('../backend/server');

const normalizePath = (path) => {
  if (Array.isArray(path)) {
    return path.join('/');
  }

  return path || '';
};

module.exports = (req, res) => {
  const path = normalizePath(req.query?.path);

  if (path) {
    const query = new URLSearchParams();
    Object.entries(req.query || {}).forEach(([key, value]) => {
      if (key === 'path') return;
      if (Array.isArray(value)) {
        value.forEach(item => query.append(key, item));
      } else if (value !== undefined) {
        query.append(key, value);
      }
    });

    const search = query.toString();
    req.url = `/api/${path}${search ? `?${search}` : ''}`;
  }

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
