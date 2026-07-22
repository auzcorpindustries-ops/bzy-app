import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

/**
 * Verify business JWT. Sets req.businessId + req.business.
 */
export function requireBusiness(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'unauthorized', message: 'Missing token', status: 401 });
  }
  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    if (decoded.type !== 'business') {
      return res.status(403).json({ error: 'forbidden', message: 'Business token required', status: 403 });
    }
    req.businessId = decoded.business_id;
    req.businessPlan = decoded.plan;
    next();
  } catch {
    return res.status(401).json({ error: 'invalid_token', message: 'Token expired or invalid', status: 401 });
  }
}

/**
 * Verify client JWT. Sets req.clientId.
 */
export function requireClient(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'unauthorized', message: 'Missing token', status: 401 });
  }
  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    if (decoded.type !== 'client') {
      return res.status(403).json({ error: 'forbidden', message: 'Client token required', status: 403 });
    }
    req.clientId = decoded.client_id;
    next();
  } catch {
    return res.status(401).json({ error: 'invalid_token', message: 'Token expired or invalid', status: 401 });
  }
}

/**
 * Accept either business or client JWT. Sets req.auth = { type, id }.
 */
export function requireAnyAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'unauthorized', message: 'Missing token', status: 401 });
  }
  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    if (decoded.type === 'business') {
      req.businessId = decoded.business_id;
    } else if (decoded.type === 'client') {
      req.clientId = decoded.client_id;
    } else {
      return res.status(403).json({ error: 'forbidden', message: 'Unknown token type', status: 403 });
    }
    req.auth = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'invalid_token', message: 'Token expired or invalid', status: 401 });
  }
}
