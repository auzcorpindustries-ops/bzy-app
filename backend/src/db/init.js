import dotenv from 'dotenv';
dotenv.config();

import { DynamoDBClient, CreateTableCommand } from '@aws-sdk/client-dynamodb';
import { config } from '../config/index.js';
import logger from '../config/logger.js';

const client = new DynamoDBClient({
  region: config.aws.region,
  ...(config.aws.dynamoEndpoint && { endpoint: config.aws.dynamoEndpoint }),
});

const tables = [
  {
    TableName: config.tables.businesses,
    KeySchema: [{ AttributeName: 'business_id', KeyType: 'HASH' }],
    AttributeDefinitions: [{ AttributeName: 'business_id', AttributeType: 'S' }],
    BillingMode: 'PAY_PER_REQUEST',
  },
  {
    TableName: config.tables.services,
    KeySchema: [{ AttributeName: 'service_id', KeyType: 'HASH' }],
    AttributeDefinitions: [
      { AttributeName: 'service_id', AttributeType: 'S' },
      { AttributeName: 'business_id', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [{
      IndexName: 'business_id-index',
      KeySchema: [{ AttributeName: 'business_id', KeyType: 'HASH' }],
      Projection: { ProjectionType: 'ALL' },
    }],
    BillingMode: 'PAY_PER_REQUEST',
  },
  {
    TableName: config.tables.bookings,
    KeySchema: [{ AttributeName: 'booking_id', KeyType: 'HASH' }],
    AttributeDefinitions: [
      { AttributeName: 'booking_id', AttributeType: 'S' },
      { AttributeName: 'business_id', AttributeType: 'S' },
      { AttributeName: 'customer_id', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'business_id-index',
        KeySchema: [{ AttributeName: 'business_id', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
      {
        IndexName: 'customer_id-index',
        KeySchema: [{ AttributeName: 'customer_id', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  },
  {
    TableName: config.tables.customers,
    KeySchema: [{ AttributeName: 'customer_id', KeyType: 'HASH' }],
    AttributeDefinitions: [
      { AttributeName: 'customer_id', AttributeType: 'S' },
      { AttributeName: 'business_id', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [{
      IndexName: 'business_id-index',
      KeySchema: [{ AttributeName: 'business_id', KeyType: 'HASH' }],
      Projection: { ProjectionType: 'ALL' },
    }],
    BillingMode: 'PAY_PER_REQUEST',
  },
  {
    TableName: config.tables.payments,
    KeySchema: [{ AttributeName: 'payment_id', KeyType: 'HASH' }],
    AttributeDefinitions: [
      { AttributeName: 'payment_id', AttributeType: 'S' },
      { AttributeName: 'business_id', AttributeType: 'S' },
      { AttributeName: 'booking_id', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'business_id-index',
        KeySchema: [{ AttributeName: 'business_id', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
      {
        IndexName: 'booking_id-index',
        KeySchema: [{ AttributeName: 'booking_id', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  },
  {
    TableName: config.tables.numberQueue,
    KeySchema: [{ AttributeName: 'phone_number', KeyType: 'HASH' }],
    AttributeDefinitions: [{ AttributeName: 'phone_number', AttributeType: 'S' }],
    BillingMode: 'PAY_PER_REQUEST',
  },
  {
    TableName: config.tables.pushTokens,
    KeySchema: [{ AttributeName: 'token', KeyType: 'HASH' }],
    AttributeDefinitions: [
      { AttributeName: 'token', AttributeType: 'S' },
      { AttributeName: 'business_id', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [{
      IndexName: 'business_id-index',
      KeySchema: [{ AttributeName: 'business_id', KeyType: 'HASH' }],
      Projection: { ProjectionType: 'ALL' },
    }],
    BillingMode: 'PAY_PER_REQUEST',
  },
];

async function createTables() {
  for (const table of tables) {
    try {
      await client.send(new CreateTableCommand(table));
      logger.info(`Created table: ${table.TableName}`);
    } catch (err) {
      if (err.name === 'ResourceInUseException') {
        logger.info(`Table already exists: ${table.TableName}`);
      } else {
        logger.error(`Failed to create ${table.TableName}:`, err.message);
      }
    }
  }
  logger.info('DynamoDB init complete.');
}

createTables().catch(err => {
  logger.error('Init failed:', err);
  process.exit(1);
});
