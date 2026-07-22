import { getSecret } from '../config/secrets.js';
import { updateBusiness, getBusinessRaw } from './businessService.js';
import logger from '../config/logger.js';

function getTwilioCreds() {
  const accountSid = getSecret('TWILIO_ACCOUNT_SID');
  const authToken = getSecret('TWILIO_AUTH_TOKEN');
  return { accountSid, authToken };
}

/**
 * Provision a Twilio number for a business.
 * Searches for an available local number, purchases it, and configures
 * voice webhooks pointing to Bzy's call endpoints.
 *
 * @param {string} businessId - The business ID
 * @param {string} webhookBaseUrl - Base URL for webhooks (e.g. https://api.bzy.app)
 * @returns {Promise<{ phoneNumber: string, sid: string }>}
 */
export async function provisionNumber(businessId, webhookBaseUrl) {
  const { accountSid, authToken } = getTwilioCreds();
  if (!accountSid || !authToken) {
    throw new Error('Twilio credentials not configured');
  }

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  const base = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}`;

  // 1. Search for an available local number
  logger.info(`Searching for available Twilio number for business ${businessId}`);
  const searchResp = await fetch(
    `${base}/AvailablePhoneNumbers/US/Local.json?VoiceEnabled=true&Limit=1`,
    { headers: { Authorization: `Basic ${auth}` } },
  );
  const searchData = await searchResp.json();

  if (!searchData.available_phone_numbers?.length) {
    throw new Error('No available Twilio numbers found');
  }

  const phoneNumber = searchData.available_phone_numbers[0].phone_number;

  // 2. Purchase the number
  logger.info(`Purchasing Twilio number: ${phoneNumber}`);
  const buyResp = await fetch(`${base}/IncomingPhoneNumbers.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      PhoneNumber: phoneNumber,
      VoiceUrl: `${webhookBaseUrl}/call/inbound`,
      VoiceMethod: 'POST',
      StatusCallback: `${webhookBaseUrl}/call/status`,
      StatusCallbackMethod: 'POST',
    }),
  });

  const buyData = await buyResp.json();
  if (!buyResp.ok) {
    throw new Error(`Failed to purchase Twilio number: ${buyData.message}`);
  }

  logger.info(`Purchased Twilio number ${phoneNumber} (SID: ${buyData.sid}) for business ${businessId}`);

  // 3. Update business record with the number
  await updateBusiness(businessId, { twilio_number: phoneNumber });

  return { phoneNumber, sid: buyData.sid };
}

/**
 * Release a Twilio number (when AI agent is disabled).
 * @param {string} businessId
 */
export async function releaseNumber(businessId) {
  const business = await getBusinessRaw(businessId);
  if (!business?.twilio_number) return;

  const { accountSid, authToken } = getTwilioCreds();
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  const base = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}`;

  // Find the incoming phone number SID
  const listResp = await fetch(
    `${base}/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(business.twilio_number)}`,
    { headers: { Authorization: `Basic ${auth}` } },
  );
  const listData = await listResp.json();

  const incomingSid = listData.incoming_phone_numbers?.[0]?.sid;
  if (!incomingSid) {
    logger.warn(`Could not find Twilio number SID for ${business.twilio_number}`);
    await updateBusiness(businessId, { twilio_number: null });
    return;
  }

  // Release the number
  await fetch(`${base}/IncomingPhoneNumbers/${incomingSid}.json`, {
    method: 'DELETE',
    headers: { Authorization: `Basic ${auth}` },
  });

  logger.info(`Released Twilio number ${business.twilio_number} for business ${businessId}`);
  await updateBusiness(businessId, { twilio_number: null });
}

/**
 * Update voice webhook URLs for a business's Twilio number.
 */
export async function updateVoiceWebhooks(businessId, webhookBaseUrl) {
  const business = await getBusinessRaw(businessId);
  if (!business?.twilio_number) return;

  const { accountSid, authToken } = getTwilioCreds();
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  const base = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}`;

  const listResp = await fetch(
    `${base}/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(business.twilio_number)}`,
    { headers: { Authorization: `Basic ${auth}` } },
  );
  const listData = await listResp.json();
  const incomingSid = listData.incoming_phone_numbers?.[0]?.sid;
  if (!incomingSid) return;

  await fetch(`${base}/IncomingPhoneNumbers/${incomingSid}.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      VoiceUrl: `${webhookBaseUrl}/call/inbound`,
      VoiceMethod: 'POST',
      StatusCallback: `${webhookBaseUrl}/call/status`,
      StatusCallbackMethod: 'POST',
    }),
  });

  logger.info(`Updated voice webhooks for ${business.twilio_number}`);
}
