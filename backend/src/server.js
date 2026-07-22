import dotenv from 'dotenv';
dotenv.config();

import { loadSecrets } from './config/secrets.js';
import app from './app.js';
import logger from './config/logger.js';

const PORT = process.env.PORT || 3001;

async function start() {
  // Load secrets from AWS Secrets Manager (falls back to env vars)
  await loadSecrets();

  app.listen(PORT, () => {
    logger.info(`Bzy backend running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
  });
}

start().catch(err => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});
