import { GetCommand, PutCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from '../db/client.js';
import { config } from '../config/index.js';
import { v4 as uuid } from 'uuid';
import bcrypt from 'bcryptjs';
import { notFound, conflict } from '../utils/errors.js';

const CLIENTS_TABLE = 'bzy-clients';
const BOOKINGS_TABLE = config.tables.bookings;
const BUSINESSES_TABLE = config.tables.businesses;
const SERVICES_TABLE = config.tables.services;

export async function createClient(data) {
  const client_id = uuid();
  const password_hash = await bcrypt.hash(data.password, 10);
  const now = new Date().toISOString();

  const client = {
    client_id,
    name: data.name,
    email: data.email.toLowerCase(),
    phone: data.phone,
    password_hash,
    created_at: now,
    status: 'active',
  };

  await docClient.send(new PutCommand({ TableName: CLIENTS_TABLE, Item: client }));
  return stripHash(client);
}

export async function findClientByEmail(email) {
  const result = await docClient.send(new ScanCommand({
    TableName: CLIENTS_TABLE,
    FilterExpression: 'email = :email',
    ExpressionAttributeValues: { ':email': email.toLowerCase() },
  }));
  return result.Items?.[0] || null;
}

export async function getClient(clientId) {
  const { Item } = await docClient.send(new GetCommand({
    TableName: CLIENTS_TABLE,
    Key: { client_id: clientId },
  }));
  if (!Item) throw notFound('Client not found');
  return stripHash(Item);
}

export async function updateClient(clientId, updates) {
  const current = await getClient(clientId);
  const allowed = ['name', 'email', 'phone'];

  const { UpdateCommand } = await import('@aws-sdk/lib-dynamodb');
  const setExpressions = [];
  const exprValues = {};
  const exprNames = {};
  let i = 0;
  for (const [key, value] of Object.entries(updates)) {
    if (!allowed.includes(key)) continue;
    i++;
    setExpressions.push(`#k${i} = :v${i}`);
    exprNames[`#k${i}`] = key;
    exprValues[`:v${i}`] = key === 'email' ? value.toLowerCase() : value;
  }
  if (setExpressions.length === 0) return current;

  const { Attributes } = await docClient.send(new UpdateCommand({
    TableName: CLIENTS_TABLE,
    Key: { client_id: clientId },
    UpdateExpression: `SET ${setExpressions.join(', ')}`,
    ExpressionAttributeNames: exprNames,
    ExpressionAttributeValues: exprValues,
    ReturnValues: 'ALL_NEW',
  }));
  return stripHash(Attributes);
}

export async function searchBusinesses(params = {}) {
  const { Items } = await docClient.send(new ScanCommand({
    TableName: BUSINESSES_TABLE,
    FilterExpression: '#status = :active',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: { ':active': 'active' },
  }));

  let businesses = Items || [];
  if (params.q) {
    const q = params.q.toLowerCase();
    businesses = businesses.filter(b => b.name?.toLowerCase().includes(q));
  }
  if (params.industry) {
    businesses = businesses.filter(b => b.industry === params.industry);
  }

  return businesses.map(b => ({
    business_id: b.business_id,
    name: b.name,
    industry: b.industry,
    timezone: b.timezone,
    office_hours: b.office_hours,
    deposit_required: b.deposit_required,
  }));
}

export async function getBusinessDetail(businessId) {
  const { Item } = await docClient.send(new GetCommand({
    TableName: BUSINESSES_TABLE,
    Key: { business_id: businessId },
  }));
  if (!Item) throw notFound('Business not found');

  const { Items } = await docClient.send(new QueryCommand({
    TableName: SERVICES_TABLE,
    IndexName: 'business_id-index',
    KeyConditionExpression: 'business_id = :bid',
    FilterExpression: '#active = :true',
    ExpressionAttributeNames: { '#active': 'active' },
    ExpressionAttributeValues: { ':bid': businessId, ':true': true },
  }));

  return {
    business_id: Item.business_id,
    name: Item.name,
    industry: Item.industry,
    timezone: Item.timezone,
    office_hours: Item.office_hours,
    deposit_required: Item.deposit_required,
    services: (Items || []).map(s => ({
      service_id: s.service_id,
      name: s.name,
      description: s.description,
      duration_minutes: s.duration_minutes,
      price_cents: s.price_cents,
      deposit_cents: s.deposit_cents,
      category: s.category,
    })),
  };
}

export async function getMyBookings(clientId, scope) {
  // Scan bookings by client_id
  const { Items } = await docClient.send(new ScanCommand({
    TableName: BOOKINGS_TABLE,
    FilterExpression: 'customer_id = :cid',
    ExpressionAttributeValues: { ':cid': clientId },
  }));

  let bookings = Items || [];
  const now = new Date().toISOString();
  if (scope === 'upcoming') {
    bookings = bookings.filter(b => b.start_time >= now && b.status === 'confirmed');
  } else if (scope === 'past') {
    bookings = bookings.filter(b => b.start_time < now || b.status !== 'confirmed');
  }
  return bookings.sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
}

export async function createClientBooking(clientId, data) {
  // Get service to compute duration
  const { Item: service } = await docClient.send(new GetCommand({
    TableName: SERVICES_TABLE,
    Key: { service_id: data.service_id },
  }));
  if (!service || service.business_id !== data.business_id) throw notFound('Service not found');

  // Get business for timezone
  const { Item: business } = await docClient.send(new GetCommand({
    TableName: BUSINESSES_TABLE,
    Key: { business_id: data.business_id },
  }));
  if (!business) throw notFound('Business not found');

  const start = new Date(data.start_time);
  const end = new Date(start.getTime() + service.duration_minutes * 60_000);
  const booking_id = uuid();
  const now = new Date().toISOString();

  const client = await getClient(clientId);

  const booking = {
    booking_id,
    business_id: data.business_id,
    customer_id: clientId,
    service_id: service.service_id,
    service_name: service.name,
    customer_name: client.name,
    customer_phone: client.phone,
    customer_email: client.email,
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    timezone: business.timezone,
    status: 'confirmed',
    deposit_paid: false,
    deposit_payment_id: null,
    deposit_amount_cents: service.deposit_cents || 0,
    deposit_refunded: false,
    notes: data.notes || '',
    created_by: 'app',
    created_at: now,
  };

  await docClient.send(new PutCommand({ TableName: BOOKINGS_TABLE, Item: booking }));
  return booking;
}

export function stripHash(client) {
  const { password_hash, ...rest } = client;
  return rest;
}
