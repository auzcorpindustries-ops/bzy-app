import { GetCommand, PutCommand, UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from '../db/client.js';
import { config } from '../config/index.js';
import { v4 as uuid } from 'uuid';
import bcrypt from 'bcryptjs';
import { notFound, conflict } from '../utils/errors.js';

const TABLE = config.tables.businesses;

export async function createBusiness(data) {
  const business_id = uuid();
  const password_hash = await bcrypt.hash(data.password, 10);
  const now = new Date().toISOString();

  const business = {
    business_id,
    name: data.business_name,
    owner_name: data.owner_name,
    owner_email: data.email.toLowerCase(),
    owner_phone: data.owner_phone,
    password_hash,
    industry: data.industry,
    timezone: data.timezone || 'America/Chicago',
    office_hours: 'Mon-Sat 9am-7pm',
    twilio_number: null,
    payment_provider: data.payment_provider,
    stripe_account_id: null,
    square_merchant_id: null,
    plan: 'free',
    ai_agent_enabled: false,
    deposit_required: false,
    deposit_amount: 0,
    deposit_percentage: 0,
    deposit_type: 'flat',
    booking_buffer_hours: 2,
    cancellation_policy_hours: 24,
    created_at: now,
    status: 'active',
  };

  await docClient.send(new PutCommand({ TableName: TABLE, Item: business }));
  return stripHash(business);
}

export async function findBusinessByEmail(email) {
  const result = await docClient.send(new ScanCommand({
    TableName: TABLE,
    FilterExpression: 'owner_email = :email',
    ExpressionAttributeValues: { ':email': email.toLowerCase() },
  }));
  return result.Items?.[0] || null;
}

export async function getBusiness(businessId) {
  const { Item } = await docClient.send(new GetCommand({
    TableName: TABLE,
    Key: { business_id: businessId },
  }));
  if (!Item) throw notFound('Business not found');
  return stripHash(Item);
}

export async function getBusinessWithHash(businessId) {
  const { Item } = await docClient.send(new GetCommand({
    TableName: TABLE,
    Key: { business_id: businessId },
  }));
  return Item || null;
}

export async function getBusinessRaw(businessId) {
  const { Item } = await docClient.send(new GetCommand({
    TableName: TABLE,
    Key: { business_id: businessId },
  }));
  if (!Item) throw notFound('Business not found');
  return Item;
}

export async function updateBusiness(businessId, updates) {
  const current = await getBusinessRaw(businessId);
  const allowed = [
    'name', 'office_hours', 'timezone', 'deposit_required', 'deposit_type',
    'deposit_amount', 'deposit_percentage', 'booking_buffer_hours',
    'cancellation_policy_hours', 'payment_provider', 'ai_agent_enabled',
    'ai_agent_voice', 'ai_agent_greeting', 'ai_agent_hours',
    'twilio_number', 'plan', 'stripe_account_id', 'square_merchant_id',
    'status',
  ];

  const updateFields = {};
  for (const key of allowed) {
    if (key in updates) updateFields[key] = updates[key];
  }

  if (Object.keys(updateFields).length === 0) return stripHash(current);

  const setExpressions = [];
  const exprValues = {};
  const exprNames = {};
  let i = 0;
  for (const [key, value] of Object.entries(updateFields)) {
    i++;
    const nameKey = `#k${i}`;
    const valKey = `:v${i}`;
    setExpressions.push(`${nameKey} = ${valKey}`);
    exprNames[nameKey] = key;
    exprValues[valKey] = value;
  }

  const { Attributes } = await docClient.send(new UpdateCommand({
    TableName: TABLE,
    Key: { business_id: businessId },
    UpdateExpression: `SET ${setExpressions.join(', ')}`,
    ExpressionAttributeNames: exprNames,
    ExpressionAttributeValues: exprValues,
    ReturnValues: 'ALL_NEW',
  }));

  return stripHash(Attributes);
}

export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

export function stripHash(business) {
  const { password_hash, ...rest } = business;
  return rest;
}
