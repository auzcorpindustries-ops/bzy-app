import { GetCommand, PutCommand, QueryCommand, UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from '../db/client.js';
import { config } from '../config/index.js';
import { v4 as uuid } from 'uuid';
import { notFound, conflict } from '../utils/errors.js';
import { getService } from './serviceService.js';
import { getBusinessRaw } from './businessService.js';

const TABLE = config.tables.bookings;
const GSI = 'business_id-index';

export async function listBookings(businessId, params = {}) {
  const { Items } = await docClient.send(new QueryCommand({
    TableName: TABLE,
    IndexName: GSI,
    KeyConditionExpression: 'business_id = :bid',
    ExpressionAttributeValues: { ':bid': businessId },
  }));

  let bookings = Items || [];

  // Filter by date range
  if (params.start_date) {
    const start = new Date(params.start_date + 'T00:00:00Z').getTime();
    bookings = bookings.filter(b => new Date(b.start_time).getTime() >= start);
  }
  if (params.end_date) {
    const end = new Date(params.end_date + 'T23:59:59Z').getTime();
    bookings = bookings.filter(b => new Date(b.start_time).getTime() <= end);
  }
  if (params.status) {
    bookings = bookings.filter(b => b.status === params.status);
  }

  return bookings.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
}

export async function getBooking(bookingId) {
  const { Item } = await docClient.send(new GetCommand({
    TableName: TABLE,
    Key: { booking_id: bookingId },
  }));
  return Item || null;
}

export async function getBookingsByDateRange(businessId, startDate, endDate) {
  const bookings = await listBookings(businessId, { start_date: startDate, end_date: endDate });
  return bookings;
}

export async function getBookingsForDate(businessId, dateStr) {
  const bookings = await listBookings(businessId, { start_date: dateStr, end_date: dateStr });
  return bookings;
}

export async function isSlotAvailable(businessId, startTime, endTime) {
  // Check existing bookings for overlap
  const dateStr = startTime.slice(0, 10);
  const dayBookings = await getBookingsForDate(businessId, dateStr);

  for (const b of dayBookings) {
    if (b.status === 'cancelled') continue;
    const bStart = new Date(b.start_time).getTime();
    const bEnd = new Date(b.end_time).getTime();
    const sStart = new Date(startTime).getTime();
    const sEnd = new Date(endTime).getTime();
    if (sStart < bEnd && sEnd > bStart) {
      return false;
    }
  }
  return true;
}

export async function createBooking(businessId, data, createdBy = 'app') {
  const service = await getService(data.service_id);
  if (!service || service.business_id !== businessId) throw notFound('Service not found');
  if (!service.active) throw conflict('Service is not active');

  const business = await getBusinessRaw(businessId);
  const start = new Date(data.start_time);
  const end = new Date(start.getTime() + service.duration_minutes * 60_000);
  const startTime = start.toISOString();
  const endTime = end.toISOString();

  // Check buffer
  const bufferMs = (business.booking_buffer_hours || 0) * 3600_000;
  if (start.getTime() - Date.now() < bufferMs) {
    throw conflict('Booking does not meet minimum buffer time');
  }

  // Check slot availability (race condition check)
  const available = await isSlotAvailable(businessId, startTime, endTime);
  if (!available) throw conflict('Time slot is not available');

  const booking_id = uuid();
  const now = new Date().toISOString();

  const booking = {
    booking_id,
    business_id: businessId,
    customer_id: data.customer_id || null,
    service_id: service.service_id,
    service_name: service.name,
    customer_name: data.customer_name,
    customer_phone: data.customer_phone,
    customer_email: data.customer_email || '',
    start_time: startTime,
    end_time: endTime,
    timezone: business.timezone,
    status: 'confirmed',
    deposit_paid: false,
    deposit_payment_id: null,
    deposit_amount_cents: service.deposit_cents || 0,
    deposit_refunded: false,
    notes: data.notes || '',
    created_by: createdBy,
    created_at: now,
  };

  await docClient.send(new PutCommand({ TableName: TABLE, Item: booking }));
  return booking;
}

export async function updateBooking(bookingId, businessId, updates) {
  const existing = await getBooking(bookingId);
  if (!existing || existing.business_id !== businessId) throw notFound('Booking not found');

  const allowed = ['start_time', 'status', 'notes'];
  const updateFields = {};
  for (const key of allowed) {
    if (key in updates) updateFields[key] = updates[key];
  }

  // If rescheduling, recompute end_time
  if (updates.start_time) {
    const service = await getService(existing.service_id);
    const start = new Date(updates.start_time);
    const end = new Date(start.getTime() + service.duration_minutes * 60_000);
    updateFields.end_time = end.toISOString();

    // Check availability for new slot
    const available = await isSlotAvailable(businessId, updates.start_time, updateFields.end_time);
    if (!available) throw conflict('Time slot is not available');
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
    Key: { booking_id: bookingId },
    UpdateExpression: `SET ${setExpressions.join(', ')}`,
    ExpressionAttributeNames: exprNames,
    ExpressionAttributeValues: exprValues,
    ReturnValues: 'ALL_NEW',
  }));
  return Attributes;
}

export async function getAvailableSlots(businessId, serviceId, dateStr) {
  const service = await getService(serviceId);
  if (!service || service.business_id !== businessId) throw notFound('Service not found');

  const business = await getBusinessRaw(businessId);
  const slots = [];

  // Parse office_hours — basic implementation
  // Format: "Mon-Sat 9am-7pm" or "Mon-Fri 9am-5pm, Sat 10am-3pm"
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dateObj = new Date(dateStr + 'T12:00:00Z');
  const dayName = dayNames[dateObj.getUTCDay()];

  const hours = parseOfficeHours(business.office_hours, dayName);
  if (!hours) return { date: dateStr, timezone: business.timezone, slots: [] };

  // Generate slots at 30-min intervals
  const [openHour, openMin] = hours.open;
  const [closeHour, closeMin] = hours.close;

  const tz = business.timezone || 'UTC';
  let cursor = new Date(dateStr + 'T00:00:00Z');
  cursor.setUTCHours(openHour, openMin, 0, 0);

  const closeTime = new Date(dateStr + 'T00:00:00Z');
  closeTime.setUTCHours(closeHour, closeMin, 0, 0);

  const durationMs = service.duration_minutes * 60_000;
  const bufferMs = (business.booking_buffer_hours || 0) * 3600_000;

  while (cursor.getTime() + durationMs <= closeTime.getTime()) {
    const slotStart = new Date(cursor);
    const slotEnd = new Date(cursor.getTime() + durationMs);

    // Skip past slots (with buffer)
    if (slotStart.getTime() - Date.now() >= bufferMs) {
      const startISO = slotStart.toISOString();
      const endISO = slotEnd.toISOString();
      const available = await isSlotAvailable(businessId, startISO, endISO);
      if (available) {
        slots.push({ start_time: startISO, end_time: endISO });
      }
    }
    cursor = new Date(cursor.getTime() + 30 * 60_000); // 30-min increments
  }

  return { date: dateStr, timezone: business.timezone, slots };
}

/**
 * Parse office_hours string for a given day.
 * Basic implementation — handles "Mon-Sat 9am-7pm" and "Mon-Fri 9am-5pm, Sat 10am-3pm"
 */
function parseOfficeHours(hoursStr, dayName) {
  if (!hoursStr) return null;

  const parts = hoursStr.split(',').map(s => s.trim());
  for (const part of parts) {
    const match = part.match(/(\w{3})(?:-(\w{3}))?\s+(\d+)(am|pm)-(\d+)(am|pm)/i);
    if (!match) continue;

    const startDay = match[1];
    const endDay = match[2] || startDay;
    const days = expandDayRange(startDay, endDay);

    if (days.includes(dayName)) {
      let openHour = parseInt(match[3]);
      let closeHour = parseInt(match[5]);
      if (match[4].toLowerCase() === 'pm' && openHour !== 12) openHour += 12;
      if (match[6].toLowerCase() === 'pm' && closeHour !== 12) closeHour += 12;
      return { open: [openHour, 0], close: [closeHour, 0] };
    }
  }
  return null;
}

function expandDayRange(start, end) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const startIdx = days.indexOf(start);
  const endIdx = days.indexOf(end);
  if (startIdx === -1 || endIdx === -1) return [start];
  if (startIdx <= endIdx) return days.slice(startIdx, endIdx + 1);
  return [...days.slice(startIdx), ...days.slice(0, endIdx + 1)];
}
