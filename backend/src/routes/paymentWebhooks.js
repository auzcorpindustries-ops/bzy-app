import express, { Router } from 'express';
import { constructEvent, handleStripeEvent } from '../services/stripeService.js';
import { verifySquareWebhook, handleSquareEvent } from '../services/squareService.js';
import logger from '../config/logger.js';

/**
 * Webhook routes — registered BEFORE express.json() in app.js.
 * These routes use express.raw() internally for signature verification.
 */
const router = Router();

// ── Stripe Webhook ──
router.post('/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  if (!sig) {
    return res.status(400).json({ error: 'missing_signature', message: 'No Stripe signature header' });
  }

  let event;
  try {
    event = constructEvent(req.body, sig);
  } catch (err) {
    logger.warn(`Stripe webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    await handleStripeEvent(event);
  } catch (err) {
    logger.error(`Error processing Stripe event ${event.type}: ${err.message}`);
    return res.status(500).json({ error: 'handler_error', message: 'Internal webhook error' });
  }

  res.json({ received: true });
});

// ── Square Webhook ──
router.post('/webhook/square', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['x-square-hmacsha256-signature'];
  if (!sig) {
    return res.status(400).json({ error: 'missing_signature', message: 'No Square signature header' });
  }

  const rawBody = req.body.toString('utf-8');

  let isValid;
  try {
    isValid = verifySquareWebhook(rawBody, sig);
  } catch (err) {
    logger.warn(`Square webhook verification error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (!isValid) {
    logger.warn('Square webhook signature verification failed');
    return res.status(400).json({ error: 'invalid_signature', message: 'Signature verification failed' });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ error: 'invalid_json', message: 'Could not parse webhook body' });
  }

  try {
    await handleSquareEvent(event);
  } catch (err) {
    logger.error(`Error processing Square event ${event.type}: ${err.message}`);
    return res.status(500).json({ error: 'handler_error', message: 'Internal webhook error' });
  }

  res.json({ received: true });
});

export default router;
