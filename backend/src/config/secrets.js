import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { config } from './index.js';
import logger from './logger.js';

const smClient = new SecretsManagerClient({ region: config.aws.region });

let _cachedSecrets = null;

/**
 * Load secrets from AWS Secrets Manager (secret ID: bzy/env).
 * Falls back to environment variables if AWS is unavailable or no secret exists.
 * Called once at startup — see server.js.
 */
export async function loadSecrets() {
  if (_cachedSecrets) return _cachedSecrets;

  const secretId = process.env.BZY_SECRET_ID || 'bzy/env';

  try {
    const response = await smClient.send(new GetSecretValueCommand({ SecretId: secretId }));
    if (response.SecretString) {
      _cachedSecrets = JSON.parse(response.SecretString);
      logger.info(`Loaded ${Object.keys(_cachedSecrets).length} secrets from AWS Secrets Manager (${secretId})`);

      // Merge into process.env (don't override existing env vars)
      for (const [key, value] of Object.entries(_cachedSecrets)) {
        if (value && !process.env[key]) {
          process.env[key] = value;
        }
      }
      return _cachedSecrets;
    }
  } catch (err) {
    logger.warn(`Could not load secrets from Secrets Manager (${secretId}): ${err.message}`);
    logger.warn('Falling back to environment variables only');
  }

  _cachedSecrets = {};
  return _cachedSecrets;
}

/**
 * Get a secret value by key (prefers env var, falls back to loaded secrets).
 */
export function getSecret(key) {
  return process.env[key] || _cachedSecrets?.[key] || null;
}
