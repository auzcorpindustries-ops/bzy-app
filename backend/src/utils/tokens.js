import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

export function signAccessToken(payload) {
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.accessExpiry });
}

export function signRefreshToken(payload) {
  return jwt.sign(
    { ...payload, refresh: true },
    config.jwt.secret,
    { expiresIn: config.jwt.refreshExpiry },
  );
}

export function signBusinessTokens(business) {
  const payload = {
    type: 'business',
    business_id: business.business_id,
    plan: business.plan,
  };
  return {
    access_token: signAccessToken(payload),
    refresh_token: signRefreshToken(payload),
  };
}

export function signClientTokens(client) {
  const payload = {
    type: 'client',
    client_id: client.client_id,
  };
  return {
    access_token: signAccessToken(payload),
    refresh_token: signRefreshToken(payload),
  };
}
