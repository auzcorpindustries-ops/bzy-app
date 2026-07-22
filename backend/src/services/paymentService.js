import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from '../db/client.js';
import { config } from '../config/index.js';
import { v4 as uuid } from 'uuid';
import { notFound, badRequest } from '../utils/errors.js';
import { createPaymentIntent, createRefund } from './stripeService.js';
import { getSecret } from '../config/secrets.js';

const TABLE = config.tables.payments;

export async function createDeposit(businessId, bookingId) {
  // Get booking
  const { Item: booking } = await docClient.send(new GetCommand({
    TableName: config.tables.bookings,
    Key: { booking_id: bookingId },
  }));
  if (!booking || booking.business_id !== businessId) throw notFound('Booking not found');

  const { getBusinessRaw } = await import('./businessService.js');
  const business = await getBusinessRaw(businessId);
  const amount = booking.deposit_amount_cents || 0;
  if (amount <= 0) throw badRequest('No deposit required for this booking');

  const payment_id = uuid();
  const now = new Date().toISOString();

  const payment = {
    payment_id,
    business_id: businessId,
    booking_id: bookingId,
    customer_id: booking.customer_id,
    type: 'deposit',
    amount_cents: amount,
    provider: business.payment_provider,
    provider_payment_id: '',
    status: 'pending',
    refund_amount_cents: 0,
    created_at: now,
  };

  // Stripe: create PaymentIntent
  if (business.payment_provider === 'stripe') {
    const stripeKey = getSecret('STRIPE_SECRET_KEY');
    if (!stripeKey) throw badRequest('Stripe is not configured');

    const intent = await createPaymentIntent(amount, {
      payment_id,
      booking_id: bookingId,
      business_id: businessId,
    });
    payment.provider_payment_id = intent.id;
    await docClient.send(new PutCommand({ TableName: TABLE, Item: payment }));
    return {
      payment_id,
      provider: 'stripe',
      client_secret: intent.client_secret,
      amount_cents: amount,
    };
  }

  // Square: return payment_id — client SDK generates the payment token
  if (business.payment_provider === 'square') {
    await docClient.send(new PutCommand({ TableName: TABLE, Item: payment }));
    return {
      payment_id,
      provider: 'square',
      square_payment_token: '',
      amount_cents: amount,
    };
  }

  // No provider configured
  await docClient.send(new PutCommand({ TableName: TABLE, Item: payment }));
  return {
    payment_id,
    provider: business.payment_provider,
    amount_cents: amount,
  };
}

export async function refundPayment(businessId, paymentId) {
  const { Item: payment } = await docClient.send(new GetCommand({
    TableName: TABLE,
    Key: { payment_id: paymentId },
  }));
  if (!payment || payment.business_id !== businessId) throw notFound('Payment not found');
  if (payment.status !== 'succeeded') throw badRequest('Payment is not in a refundable state');

  if (payment.provider === 'stripe') {
    const refund = await createRefund(payment.provider_payment_id);
    const { Attributes } = await docClient.send(new UpdateCommand({
      TableName: TABLE,
      Key: { payment_id: paymentId },
      UpdateExpression: 'SET #status = :s, refund_amount_cents = :r',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':s': 'refunded', ':r': payment.amount_cents },
      ReturnValues: 'ALL_NEW',
    }));

    // Mark booking deposit as refunded
    if (Attributes?.booking_id) {
      await docClient.send(new UpdateCommand({
        TableName: config.tables.bookings,
        Key: { booking_id: Attributes.booking_id },
        UpdateExpression: 'SET deposit_refunded = :t',
        ExpressionAttributeValues: { ':t': true },
      }));
    }

    return { payment: Attributes };
  }

  // Square refund stub
  const { Attributes } = await docClient.send(new UpdateCommand({
    TableName: TABLE,
    Key: { payment_id: paymentId },
    UpdateExpression: 'SET #status = :s, refund_amount_cents = :r',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: { ':s': 'refunded', ':r': payment.amount_cents },
    ReturnValues: 'ALL_NEW',
  }));
  return { payment: Attributes };
}

export async function markPaymentSucceeded(paymentId, providerPaymentId) {
  const { Attributes } = await docClient.send(new UpdateCommand({
    TableName: TABLE,
    Key: { payment_id: paymentId },
    UpdateExpression: 'SET #status = :s, provider_payment_id = :p',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: { ':s': 'succeeded', ':p': providerPaymentId },
    ReturnValues: 'ALL_NEW',
  }));

  // Mark booking deposit as paid
  if (Attributes?.booking_id) {
    await docClient.send(new UpdateCommand({
      TableName: config.tables.bookings,
      Key: { booking_id: Attributes.booking_id },
      UpdateExpression: 'SET deposit_paid = :t, deposit_payment_id = :p',
      ExpressionAttributeValues: { ':t': true, ':p': paymentId },
    }));
  }

  return Attributes;
}
