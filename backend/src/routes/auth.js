import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { createBusiness, findBusinessByEmail, getBusiness, getBusinessWithHash, verifyPassword, stripHash } from '../services/businessService.js';
import { signBusinessTokens } from '../utils/tokens.js';
import { validateBody } from '../middleware/validate.js';
import { registerSchema, loginSchema, refreshSchema } from '../schemas/auth.js';
import { badRequest } from '../utils/errors.js';
import { requireBusiness } from '../middleware/auth.js';

const router = Router();

// POST /auth/register
router.post('/register', validateBody(registerSchema), async (req, res, next) => {
  try {
    const existing = await findBusinessByEmail(req.body.email);
    if (existing) return next(badRequest('Email already registered'));

    const business = await createBusiness(req.body);
    const tokens = signBusinessTokens(business);
    res.status(201).json({ ...tokens, business });
  } catch (err) { next(err); }
});

// POST /auth/login
router.post('/login', validateBody(loginSchema), async (req, res, next) => {
  try {
    const business = await findBusinessByEmail(req.body.email);
    if (!business) return next(badRequest('Invalid email or password'));

    const valid = await verifyPassword(req.body.password, business.password_hash);
    if (!valid) return next(badRequest('Invalid email or password'));

    const tokens = signBusinessTokens(business);
    res.json({ ...tokens, business: stripHash(business) });
  } catch (err) { next(err); }
});

// POST /auth/refresh
router.post('/refresh', validateBody(refreshSchema), async (req, res, next) => {
  try {
    const decoded = jwt.verify(req.body.refresh_token, config.jwt.secret);
    if (!decoded.refresh) return next(badRequest('Invalid refresh token'));
    if (decoded.type !== 'business') return next(badRequest('Invalid refresh token'));

    const business = await getBusiness(decoded.business_id);
    const tokens = signBusinessTokens(business);
    res.json(tokens);
  } catch (err) {
    next(badRequest('Invalid refresh token'));
  }
});

// GET /auth/me
router.get('/me', requireBusiness, async (req, res, next) => {
  try {
    const business = await getBusiness(req.businessId);
    res.json(business);
  } catch (err) { next(err); }
});

// POST /auth/logout
router.post('/logout', (_req, res) => {
  // Stateless JWT — client just discards tokens
  res.json({ message: 'Logged out' });
});

export default router;
