import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import {
  createClient, findClientByEmail, getClient, updateClient,
  searchBusinesses, getBusinessDetail, getMyBookings, createClientBooking,
  stripHash,
} from '../services/clientService.js';
import { requireClient } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import {
  clientRegisterSchema, clientLoginSchema, clientUpdateMeSchema,
  clientCreateBookingSchema, businessSearchSchema, availabilityQueryClientSchema,
} from '../schemas/client.js';
import { signClientTokens } from '../utils/tokens.js';
import { badRequest } from '../utils/errors.js';
import { getAvailableSlots } from '../services/bookingService.js';
import { createDeposit } from '../services/paymentService.js';
import { registerPushToken } from '../services/pushService.js';
import { registerPushTokenSchema } from '../schemas/push.js';

const router = Router();

// ── Client Auth ──

router.post('/auth/register', validateBody(clientRegisterSchema), async (req, res, next) => {
  try {
    const existing = await findClientByEmail(req.body.email);
    if (existing) return next(badRequest('Email already registered'));

    const client = await createClient(req.body);
    const tokens = signClientTokens(client);
    res.status(201).json({ ...tokens, client });
  } catch (err) { next(err); }
});

router.post('/auth/login', validateBody(clientLoginSchema), async (req, res, next) => {
  try {
    const client = await findClientByEmail(req.body.email);
    if (!client) return next(badRequest('Invalid email or password'));

    const { verifyPassword } = await import('../services/clientService.js');
    // Check password
    const bcrypt = (await import('bcryptjs')).default;
    const valid = await bcrypt.compare(req.body.password, client.password_hash);
    if (!valid) return next(badRequest('Invalid email or password'));

    const tokens = signClientTokens(stripHash(client));
    res.json({ ...tokens, client: stripHash(client) });
  } catch (err) { next(err); }
});

router.post('/auth/refresh', async (req, res, next) => {
  try {
    const decoded = jwt.verify(req.body.refresh_token, config.jwt.secret);
    if (!decoded.refresh || decoded.type !== 'client') return next(badRequest('Invalid refresh token'));

    const client = await getClient(decoded.client_id);
    const tokens = signClientTokens(client);
    res.json(tokens);
  } catch (err) {
    next(badRequest('Invalid refresh token'));
  }
});

router.get('/auth/me', requireClient, async (req, res, next) => {
  try {
    const client = await getClient(req.clientId);
    res.json(client);
  } catch (err) { next(err); }
});

router.patch('/auth/me', requireClient, validateBody(clientUpdateMeSchema), async (req, res, next) => {
  try {
    const client = await updateClient(req.clientId, req.body);
    res.json(client);
  } catch (err) { next(err); }
});

router.post('/auth/logout', (_req, res) => {
  res.json({ message: 'Logged out' });
});

// ── Public Business Search ──

router.get('/businesses', validateQuery(businessSearchSchema), async (req, res, next) => {
  try {
    const items = await searchBusinesses(req.query);
    res.json({ items });
  } catch (err) { next(err); }
});

router.get('/businesses/:id', async (req, res, next) => {
  try {
    const detail = await getBusinessDetail(req.params.id);
    res.json(detail);
  } catch (err) { next(err); }
});

router.get('/businesses/:id/availability', validateQuery(availabilityQueryClientSchema), async (req, res, next) => {
  try {
    const result = await getAvailableSlots(req.params.id, req.query.service_id, req.query.date);
    res.json(result);
  } catch (err) { next(err); }
});

// ── Client Bookings (auth required) ──

router.get('/bookings', requireClient, async (req, res, next) => {
  try {
    const items = await getMyBookings(req.clientId, req.query.scope);
    res.json({ items });
  } catch (err) { next(err); }
});

router.get('/bookings/:id', requireClient, async (req, res, next) => {
  try {
    const { getBooking } = await import('../services/bookingService.js');
    const booking = await getBooking(req.params.id);
    if (!booking || booking.customer_id !== req.clientId) {
      return res.status(404).json({ error: 'not_found', message: 'Booking not found', status: 404 });
    }
    res.json(booking);
  } catch (err) { next(err); }
});

router.post('/bookings', requireClient, validateBody(clientCreateBookingSchema), async (req, res, next) => {
  try {
    const booking = await createClientBooking(req.clientId, req.body);
    res.status(201).json(booking);
  } catch (err) { next(err); }
});

router.patch('/bookings/:id', requireClient, async (req, res, next) => {
  try {
    if (req.body.status !== 'cancelled') {
      return res.status(400).json({ error: 'bad_request', message: 'Clients can only cancel bookings', status: 400 });
    }
    const { updateBooking } = await import('../services/bookingService.js');
    const booking = await updateBooking(req.params.id, req.body.business_id, { status: 'cancelled' });
    res.json(booking);
  } catch (err) { next(err); }
});

// ── Client Payments ──

router.post('/payments/deposit', requireClient, async (req, res, next) => {
  try {
    const result = await createDeposit(req.body.business_id, req.body.booking_id);
    res.status(201).json(result);
  } catch (err) { next(err); }
});

// ── Client Push ──

router.post('/push/token', requireClient, validateBody(registerPushTokenSchema), async (req, res, next) => {
  try {
    await registerPushToken(req.clientId, req.body.token, req.body.platform);
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
