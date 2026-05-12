const mongoose = require('mongoose');

const DATABASE_WAIT_MS = Number(process.env.DATABASE_WAIT_MS || 10000);

const databaseStatusMessage = () => {
  if (mongoose.connection.readyState === 2) {
    return 'Database is still connecting. Please try again in a moment.';
  }

  return 'Database is not connected. Set MONGODB_URI in Vercel to a reachable MongoDB Atlas connection string.';
};

const waitForDatabase = async () => {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  if (mongoose.connection.readyState !== 2) {
    throw new Error(databaseStatusMessage());
  }

  await Promise.race([
    mongoose.connection.asPromise(),
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(databaseStatusMessage())), DATABASE_WAIT_MS);
    })
  ]);
};

const requireDatabase = async (req, res, next) => {
  try {
    await waitForDatabase();
    next();
  } catch (err) {
    res.status(503).json({ error: err.message || databaseStatusMessage() });
  }
};

module.exports = { databaseStatusMessage, requireDatabase, waitForDatabase };
