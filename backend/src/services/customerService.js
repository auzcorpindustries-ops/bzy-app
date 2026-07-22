import { GetCommand, PutCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from '../db/client.js';
import { config } from '../config/index.js';
import { v4 as uuid } from 'uuid';
import { notFound } from '../utils/errors.js';

const TABLE = config.tables.customers;
const GSI = 'business_id-index';

export async function listCustomers(businessId) {
  const { Items } = await docClient.send(new QueryCommand({
    TableName: TABLE,
    IndexName: GSI,
    KeyConditionExpression: 'business_id = :bid',
    ExpressionAttributeValues: { ':bid': businessId },
  }));
  return Items || [];
}

export async function getCustomer(customerId) {
  const { Item } = await docClient.send(new GetCommand({
    TableName: TABLE,
    Key: { customer_id: customerId },
  }));
  return Item || null;
}

export async function getCustomerDetail(customerId, businessId) {
  const customer = await getCustomer(customerId);
  if (!customer || customer.business_id !== businessId) throw notFound('Customer not found');

  // Get bookings for this customer
  const { Items } = await docClient.send(new ScanCommand({
    TableName: config.tables.bookings,
    FilterExpression: 'customer_id = :cid AND business_id = :bid',
    ExpressionAttributeValues: { ':cid': customerId, ':bid': businessId },
  }));

  return { customer, bookings: Items || [] };
}

/**
 * Find or create a customer by phone+business.
 */
export async function findOrCreateCustomer(businessId, { name, phone, email }) {
  const { Items } = await docClient.send(new ScanCommand({
    TableName: TABLE,
    FilterExpression: 'business_id = :bid AND phone = :phone',
    ExpressionAttributeValues: { ':bid': businessId, ':phone': phone },
  }));

  if (Items?.[0]) return Items[0];

  const customer_id = uuid();
  const now = new Date().toISOString();
  const customer = {
    customer_id,
    business_id: businessId,
    name,
    phone,
    email: email || '',
    notes: '',
    total_bookings: 0,
    total_spent_cents: 0,
    first_booking_at: null,
    last_booking_at: null,
    created_at: now,
  };
  await docClient.send(new PutCommand({ TableName: TABLE, Item: customer }));
  return customer;
}
