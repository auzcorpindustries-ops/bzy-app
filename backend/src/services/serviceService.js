import { GetCommand, PutCommand, QueryCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from '../db/client.js';
import { config } from '../config/index.js';
import { v4 as uuid } from 'uuid';
import { notFound } from '../utils/errors.js';

const TABLE = config.tables.services;
const GSI = 'business_id-index';

export async function listServices(businessId) {
  const { Items } = await docClient.send(new QueryCommand({
    TableName: TABLE,
    IndexName: GSI,
    KeyConditionExpression: 'business_id = :bid',
    ExpressionAttributeValues: { ':bid': businessId },
  }));
  return Items || [];
}

export async function getService(serviceId) {
  const { Item } = await docClient.send(new GetCommand({
    TableName: TABLE,
    Key: { service_id: serviceId },
  }));
  return Item || null;
}

export async function createService(businessId, data) {
  const service_id = uuid();
  const now = new Date().toISOString();
  const service = {
    service_id,
    business_id: businessId,
    name: data.name,
    description: data.description || '',
    duration_minutes: data.duration_minutes,
    price_cents: data.price_cents,
    deposit_cents: data.deposit_cents || 0,
    category: data.category || 'general',
    active: true,
    created_at: now,
  };
  await docClient.send(new PutCommand({ TableName: TABLE, Item: service }));
  return service;
}

export async function updateService(serviceId, businessId, updates) {
  const existing = await getService(serviceId);
  if (!existing || existing.business_id !== businessId) throw notFound('Service not found');

  const allowed = ['name', 'description', 'duration_minutes', 'price_cents', 'deposit_cents', 'category', 'active'];
  const updateFields = {};
  for (const key of allowed) {
    if (key in updates) updateFields[key] = updates[key];
  }
  if (Object.keys(updateFields).length === 0) return existing;

  const setExpressions = [];
  const exprValues = {};
  const exprNames = {};
  let i = 0;
  for (const [key, value] of Object.entries(updateFields)) {
    i++;
    setExpressions.push(`#k${i} = :v${i}`);
    exprNames[`#k${i}`] = key;
    exprValues[`:v${i}`] = value;
  }

  const { Attributes } = await docClient.send(new UpdateCommand({
    TableName: TABLE,
    Key: { service_id: serviceId },
    UpdateExpression: `SET ${setExpressions.join(', ')}`,
    ExpressionAttributeNames: exprNames,
    ExpressionAttributeValues: exprValues,
    ReturnValues: 'ALL_NEW',
  }));
  return Attributes;
}

export async function deleteService(serviceId, businessId) {
  const existing = await getService(serviceId);
  if (!existing || existing.business_id !== businessId) throw notFound('Service not found');
  await docClient.send(new DeleteCommand({ TableName: TABLE, Key: { service_id: serviceId } }));
}
