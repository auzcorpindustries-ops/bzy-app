import Stripe from 'stripe';
import { config } from '../config/index.js';
import { getSecret } from '../config/secrets.js';
import { markPaymentSucceeded } from './paymentService.js';
import { updateBusiness, getBusinessRaw } from './businessService.js';
import logger from '../config/logger.js';

let _stripe = null;

function getStripe() {
  if (_stripe) return _stripe;
  const key = getSecret('STRIPE_SECRET_KEY');
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
  _stripe = new Stripe(key);
  return _stripe;
}

export function getWebhookSecret() {
  return getSecret('STRIPE_WEBHOOK_SECRET');
}

/**
 * Verify and construct a Stripe webhook event from the raw body.
 */
export function constructEvent(rawBody, signature) {
  const secret = getWebhookSecret();
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET not configured');
  return getStripe().webhooks.constructEvent(rawBody, signature, secret);
}

/**
 * Handle verified Stripe webhook events.
 * Bzy cares about:
 *   - payment_intent.succeeded → mark deposit paid on booking
 *   - payment_intent.payment_failed → log + alert
 *   - checkout.session.completed → activate business subscription
 *   - customer.subscription.deleted → downgrade plan
 */
export async function handleStripeEvent(event) {
  logger.info(`Stripe event: ${event.type} (id=${event.id})`);

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const intent = event.data.object;
      const paymentId = intent.metadata?.payment_id;
      logger.info(`Deposit succeeded: pi=${intent.id} payment_id=${paymentId} amount=$${intent.amount / 100}`);

      if (paymentId) {
        await markPaymentSucceeded(paymentId, intent.id);
        logger.info(`Marked payment ${paymentId} as succeeded, booking deposit updated`);
      }
      break;
    }

    case 'payment_intent.payment_failed': {
      const intent = event.data.object;
      const paymentId = intent.metadata?.payment_id;
      logger.warn(`Deposit FAILED: pi=${intent.id} payment_id=${paymentId}`);
      break;
    }

    case 'checkout.session.completed': {
      const session = event.data.object;
      if (session.mode === 'subscription') {
        const businessId = session.metadata?.business_id;
        const plan = session.metadata?.plan; // 'pro' or 'elite'

        if (businessId && plan) {
          await updateBusiness(businessId, {
            plan,
            stripe_account_id: session.customer?.toString() || null,
            status: 'active',
          });
          logger.info(`Subscription activated: business=${businessId} plan=${plan}`);
        }
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      const businessId = sub.metadata?.business_id;
      if (businessId) {
        await updateBusiness(businessId, { plan: 'free', ai_agent_enabled: false });
        logger.info(`Subscription cancelled: business=${businessId} downgraded to free`);
      }
      break;
    }

    case 'charge.refunded': {
      const charge = event.data.object;
      logger.info(`Refund processed: charge=${charge.id} amount=$${charge.amount_refunded / 100}`);
      break;
    }

    default:
      logger.debug(`Unhandled Stripe event type: ${event.type}`);
  }
}

/**
 * Create a Stripe PaymentIntent for a deposit.
 */
export async function createPaymentIntent(amountCents, metadata = {}) {
  const stripe = getStripe();
  const intent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: 'usd',
    automatic_payment_methods: { enabled: true },
    metadata,
  });
  return intent;
}

/**
 * Create a Stripe refund.
 */
export async function createRefund(paymentIntentId) {
  const stripe = getStripe();
  const refund = await stripe.refunds.create({ payment_intent: paymentIntentId });
  return refund;
}

/**
 * Create a Stripe Checkout Session for subscription signup.
 */
export async function createCheckoutSession(businessId, plan, priceId) {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { business_id: businessId, plan },
    success_url: `${config.corsOrigin}/settings?subscription=success`,
    cancel_url: `${config.corsOrigin}/settings?subscription=cancelled`,
  });
  return session;
}
