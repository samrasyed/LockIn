const { runApp } = require('../_handler');

module.exports = (req, res) => runApp(req, res, '/api/auth/me');
