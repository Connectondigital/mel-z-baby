require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5000,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET || 'default-secret-change-me',
  JWT_EXPIRES_IN: '7d',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://127.0.0.1:8080',
};
