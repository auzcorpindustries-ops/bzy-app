import { PutCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from '../db/client.js';
import { config } from '../config/index.js';
import logger from '../config/logger.js';

const TABLE = config.tables.pushTokens;

export async function registerPushToken(businessId, token, platform) {
  await docClient.send(new PutCommand({
    TableName: TABLE,
    Item: {
      token,
      business_id: businessId,
      platform,
      created_at: new Date().toISOString(),
    },
  }));
}

export async function getPushTokens(businessId) {
  const { Items } = await docClient.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'business_id-index',
    KeyConditionExpression: 'business_id = :bid',
    ExpressionAttributeValues: { ':bid': businessId },
  }));
  return Items || [];
}

export async function sendPushNotification(businessId, title, body, data = {}) {
  const tokens = await getPushTokens(businessId);
  if (tokens.length === 0) return { sent: 0 };

  const messages = tokens.map(t => ({
    to: t.token,
    title,
    body,
    data,
    sound: 'default',
  }));

  // Use Expo Push API
  const resp = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(config.expo.accessToken && { Authorization: `Bearer ${config.expo.accessToken}` }),
    },
    body: JSON.stringify(messages),
  });

  const result = await resp.json();
  logger.debug(`Push sent to ${tokens.length} devices for business ${businessId}`);
  return { sent: tokens.length, result };
}

export async function sendTestPush(businessId) {
  return sendPushNotification(
    businessId,
    'Bzy Test Notification',
    'Push notifications are working! 🎉',
    { type: 'test' },
  );
}
