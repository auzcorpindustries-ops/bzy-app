import crypto from 'crypto';
import { getSecret } from '../config/secrets.js';
import { markPaymentSucceeded } from './paymentService.js';
import { updateBusiness } from './businessService.js';
import logger from '../config/logger.js';

const SQUARE_HOSTS = {
  sandbox: 'connect.squareupsandbox.com',
  production: 'connect.squareup.com',
};

function getSquareHost() {
  const env = getSecret('SQUARE_ENVIRONMENT') || 'production';
  return SQUARE_HOSTS[env] || SQUARE_HOSTS.production;
}

/**
 * Verify a Square webhook signature.
 * Square uses HMAC-SHA256 with the webhook signature key.
 *
 * The signature header format is: "t=<timestamp>,v1=<signature1>,v1=<signature2>,..."
 */
export function verifySquareWebhook(rawBody, signatureHeader) {
  const signatureKey = getSecret('SQUARE_WEBHOOK_SIGNATURE_KEY');
  if (!signatureKey) {
    throw new Error('SQUARE_WEBHOOK_SIGNATURE_KEY not configured');
  }

  if (!signatureHeader) return false;

  // Parse the signature header
  const parts = signatureHeader.split(',');
  let timestamp = null;
  const signatures = [];

  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key === 't') timestamp = value;
    else if (key === 'v1') signatures.push(value);
  }

  if (!timestamp || signatures.length === 0) return false;

  // Reject if timestamp is too old (5 minutes)
  const ageMs = Date.now() - parseInt(timestamp) * 1000;
  if (ageMs > 5 * 60 * 1000) {
    logger.warn('Square webhook timestamp too old', { ageMs });
    return false;
  }

  // Compute expected signature: HMAC-SHA256(key, timestamp + body)
  const payload = timestamp + rawBody;
  const expected = crypto
    .createHmac('sha256', signatureKey)
    .update(payload)
    .digest('hex');

  // Check if any provided signature matches
  const isValid = signatures.some(sig => {
    try {
      return crypto.timingSafeEqual(
        Buffer.from(sig, 'hex'),
        Buffer.from(expected, 'hex'),
      );
    } catch {
      return false;
    }
  });

  return isValid;
}

/**
 * Handle verified Square webhook events.
 * Bzy cares about:
 *   - payment.updated (CAPTURED) → mark deposit paid
 *     - payment.updated (FAILED) → log
 */
export async function handleSquareEvent(event) {
  const type = event.type;
  logger.info(`Square event: ${type}`);

  switch (type) {
    case 'payment.updated': {
      const payment = event.data?.object?.payment;
      if (!payment) break;

      const status = payment.status;
      const orderId = payment.order_id;
      const paymentId = payment.id; // Square payment ID

      logger.info(`Square payment updated: id=${paymentId} status=${status} amount=${payment.total_money?.amount}`);

      if (status === 'COMPLETED') {
        // Look up our internal payment record by provider_payment_id
        // The metadata we stored when creating the deposit should link back
        const internalPaymentId = payment.note || payment.metadata?.payment_id;
        if (internalPaymentId) {
          await markPaymentSucceeded(internalPaymentId, paymentId);
          logger.info(`Marked payment ${internalPaymentId} as succeeded via Square`);
        }
      } else if (status === 'FAILED') {
        logger.warn(`Square payment failed: ${paymentId}`);
      }
      break;
    }

    case 'refund.updated': {
      const refund = event.data?.object?.refund;
      if (!refund) break;
      logger.info(`Square refund updated: id=${refund.id} status=${refund.status}`);
      break;
    }

    default:
      logger.debug(`Unhandled Square event type: ${type}`);
  }
}

/**
 * Create a Square payment for a deposit.
 * Uses the Square API directly (not the SDK, to avoid dependency overhead).
 */
export async function createSquarePayment(accessToken, amountCents, currency = 'USD', idempotencyKey, note = '') {
  const host = getSquareHost();
  const url = `https://${host}/v2/payments`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Square-Version': '2024-12-18',
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      idempotency_key: idempotencyKey,
      amount_money: { amount: amountCents, currency },
      source_id: '', // Client-side token from Square In-App Payments SDK
      note,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Square payment creation failed: ${data.errors?.[0]?.detail || response.statusText}`);
  }
  return data.payment;
}

/**
 * Create a Square refund.
 */
export async function createSquareRefund(accessToken, paymentId, amountCents, idempotencyKey) {
  const host = getSquareHost();
  const url = `https://${host}/v2/refunds`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Square-Version': '2024-12-18',
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      idempotency_key: idempotencyKey,
      amount_money: { amount: amountCents, currency: 'USD' },
      payment_id: paymentId,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Square refund failed: ${data.errors?.[0]?.detail || response.statusText}`);
  }
  return data.refund;
}
