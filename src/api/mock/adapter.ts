// In-memory mock backend. Active while EXPO_PUBLIC_USE_MOCKS=true so the
// entire frontend works before the real backend is connected.
// Swap-out: set EXPO_PUBLIC_USE_MOCKS=false and EXPO_PUBLIC_API_BASE_URL.

import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { AxiosHeaders } from 'axios';
import { mockBookings, mockBusiness, mockCustomers, mockServices } from './fixtures';
import { mockBusinessDirectory, mockClient, mockClientBookings } from './clientFixtures';
import type { ClientBooking, ClientCreateBookingRequest } from '@/types/client';
import type { Booking, Customer, Service } from '@/types/models';
import type {
  AvailabilityResponse,
  CreateBookingRequest,
  CreateServiceRequest,
  UpdateBookingRequest,
  UpdateSettingsRequest,
} from '@/types/api';

// Mutable in-memory state
const db = {
  business: { ...mockBusiness },
  services: [...mockServices],
  bookings: [...mockBookings],
  customers: [...mockCustomers],
  aiAgent: {
    enabled: false,
    twilio_number: null as string | null,
    voice: 'alloy',
    greeting: null as string | null,
    minutes_used: 0,
    minutes_included: 500,
  },
  client: { ...mockClient },
  directory: mockBusinessDirectory.map((b) => ({ ...b, services: [...b.services] })),
  clientBookings: [...mockClientBookings],
};

let idCounter = 100;
const uid = (prefix: string) => `${prefix}-${String(idCounter++).padStart(3, '0')}`;
const LATENCY_MS = 350;

function ok(data: unknown, config: InternalAxiosRequestConfig) {
  return new Promise((resolve) =>
    setTimeout(
      () =>
        resolve({
          data,
          status: 200,
          statusText: 'OK',
          headers: new AxiosHeaders(),
          config,
        }),
      LATENCY_MS,
    ),
  );
}

function computeSlots(serviceId: string, date: string): AvailabilityResponse {
  const service = db.services.find((s) => s.service_id === serviceId);
  const duration = service?.duration_minutes ?? 60;
  const slots: AvailabilityResponse['slots'] = [];
  // 9am–7pm CT ≈ 14:00–00:00 UTC; generate slots and drop overlaps with bookings
  for (let h = 14; h + duration / 60 <= 24; h++) {
    const start = new Date(`${date}T00:00:00Z`);
    start.setUTCHours(h, 0, 0, 0);
    const end = new Date(start.getTime() + duration * 60_000);
    const overlaps = db.bookings.some(
      (b) =>
        b.status === 'confirmed' &&
        new Date(b.start_time) < end &&
        new Date(b.end_time) > start,
    );
    if (!overlaps && start.getTime() > Date.now()) {
      slots.push({ start_time: start.toISOString(), end_time: end.toISOString() });
    }
  }
  return { date, timezone: db.business.timezone, slots };
}

export function installMockAdapter(instance: AxiosInstance) {
  instance.defaults.adapter = async (config) => {
    const method = (config.method ?? 'get').toLowerCase();
    const url = (config.url ?? '').split('?')[0];
    const body = config.data ? JSON.parse(config.data as string) : {};
    const params = (config.params ?? {}) as Record<string, string>;
    const respond = (data: unknown) => ok(data, config) as never;

    // ---- Auth ----
    if (url === '/auth/register' || url === '/auth/login') {
      return respond({
        access_token: 'mock-jwt',
        refresh_token: 'mock-refresh',
        business: db.business,
      });
    }
    if (url === '/auth/refresh') return respond({ access_token: 'mock-jwt' });
    if (url === '/auth/me') return respond(db.business);

    // ---- Services ----
    if (url === '/api/services' && method === 'get') return respond({ items: db.services });
    if (url === '/api/services' && method === 'post') {
      const b = body as CreateServiceRequest;
      const svc: Service = {
        service_id: uid('svc'),
        business_id: db.business.business_id,
        name: b.name,
        description: b.description ?? '',
        duration_minutes: b.duration_minutes,
        price_cents: b.price_cents,
        deposit_cents: b.deposit_cents ?? 0,
        category: b.category ?? 'general',
        active: true,
        created_at: new Date().toISOString(),
      };
      db.services.push(svc);
      return respond(svc);
    }
    const svcMatch = url.match(/^\/api\/services\/(.+)$/);
    if (svcMatch) {
      const idx = db.services.findIndex((s) => s.service_id === svcMatch[1]);
      if (method === 'patch' && idx >= 0) {
        db.services[idx] = { ...db.services[idx], ...body };
        return respond(db.services[idx]);
      }
      if (method === 'delete' && idx >= 0) {
        db.services.splice(idx, 1);
        return respond({});
      }
    }

    // ---- Bookings ----
    if (url === '/api/bookings/availability') {
      return respond(computeSlots(params.service_id, params.date));
    }
    if (url === '/api/bookings' && method === 'get') {
      let items = db.bookings;
      if (params.start_date) items = items.filter((b) => b.start_time >= `${params.start_date}T00:00:00Z`);
      if (params.end_date) items = items.filter((b) => b.start_time <= `${params.end_date}T23:59:59Z`);
      if (params.status) items = items.filter((b) => b.status === params.status);
      return respond({ items });
    }
    if (url === '/api/bookings' && method === 'post') {
      const b = body as CreateBookingRequest;
      const service = db.services.find((s) => s.service_id === b.service_id);
      const start = new Date(b.start_time);
      const end = new Date(start.getTime() + (service?.duration_minutes ?? 60) * 60_000);
      let customer = db.customers.find((c) => c.phone === b.customer_phone);
      if (!customer) {
        customer = {
          customer_id: uid('cus'),
          business_id: db.business.business_id,
          name: b.customer_name,
          phone: b.customer_phone,
          email: b.customer_email ?? '',
          notes: '',
          total_bookings: 0,
          total_spent_cents: 0,
          first_booking_at: null,
          last_booking_at: null,
          created_at: new Date().toISOString(),
        };
        db.customers.push(customer);
      }
      customer.total_bookings += 1;
      customer.last_booking_at = b.start_time;
      customer.first_booking_at ??= b.start_time;
      const booking: Booking = {
        booking_id: uid('bkg'),
        business_id: db.business.business_id,
        customer_id: customer.customer_id,
        service_id: b.service_id,
        service_name: service?.name ?? 'Service',
        customer_name: b.customer_name,
        customer_phone: b.customer_phone,
        customer_email: b.customer_email ?? '',
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        timezone: db.business.timezone,
        status: 'confirmed',
        deposit_paid: false,
        deposit_payment_id: null,
        deposit_amount_cents: service?.deposit_cents ?? 0,
        deposit_refunded: false,
        notes: b.notes ?? '',
        created_by: 'app',
        created_at: new Date().toISOString(),
      };
      db.bookings.push(booking);
      return respond(booking);
    }
    const bkgMatch = url.match(/^\/api\/bookings\/(.+)$/);
    if (bkgMatch) {
      const booking = db.bookings.find((b) => b.booking_id === bkgMatch[1]);
      if (!booking) throw mockError(404, 'not_found', 'Booking not found', config);
      if (method === 'get') return respond(booking);
      if (method === 'patch') {
        const u = body as UpdateBookingRequest;
        if (u.start_time) {
          const dur = new Date(booking.end_time).getTime() - new Date(booking.start_time).getTime();
          booking.start_time = new Date(u.start_time).toISOString();
          booking.end_time = new Date(new Date(u.start_time).getTime() + dur).toISOString();
        }
        if (u.status) booking.status = u.status;
        if (u.notes !== undefined) booking.notes = u.notes;
        return respond(booking);
      }
    }

    // ---- Customers ----
    if (url === '/api/customers' && method === 'get') return respond({ items: db.customers });
    const cusMatch = url.match(/^\/api\/customers\/(.+)$/);
    if (cusMatch) {
      const customer = db.customers.find((c) => c.customer_id === cusMatch[1]) as Customer;
      return respond({
        customer,
        bookings: db.bookings.filter((b) => b.customer_id === cusMatch[1]),
      });
    }

    // ---- Payments ----
    if (url === '/api/payments/deposit') {
      const booking = db.bookings.find((b) => b.booking_id === body.booking_id);
      return respond({
        payment_id: uid('pay'),
        provider: db.business.payment_provider,
        client_secret: 'pi_mock_secret',
        amount_cents: booking?.deposit_amount_cents ?? 0,
      });
    }
    const refundMatch = url.match(/^\/api\/payments\/(.+)\/refund$/);
    if (refundMatch) {
      return respond({
        payment: {
          payment_id: refundMatch[1],
          business_id: db.business.business_id,
          booking_id: '',
          customer_id: '',
          type: 'deposit',
          amount_cents: 500,
          provider: db.business.payment_provider,
          provider_payment_id: 'pi_mock',
          status: 'refunded',
          refund_amount_cents: 500,
          created_at: new Date().toISOString(),
        },
      });
    }

    // ---- AI Agent ----
    if (url === '/api/ai-agent/enable') {
      db.aiAgent.enabled = true;
      db.aiAgent.twilio_number = '+18885550199';
      db.business.ai_agent_enabled = true;
      db.business.twilio_number = db.aiAgent.twilio_number;
      return respond(db.aiAgent);
    }
    if (url === '/api/ai-agent/disable') {
      db.aiAgent.enabled = false;
      db.business.ai_agent_enabled = false;
      return respond(db.aiAgent);
    }
    if (url === '/api/ai-agent/status') return respond(db.aiAgent);
    if (url === '/api/ai-agent/settings') {
      Object.assign(db.aiAgent, body);
      return respond(db.aiAgent);
    }

    // ---- Settings ----
    if (url === '/api/settings' && method === 'get') return respond(db.business);
    if (url === '/api/settings' && method === 'patch') {
      Object.assign(db.business, body as UpdateSettingsRequest);
      return respond(db.business);
    }

    // ---- Push ----
    if (url === '/api/push/token' || url === '/api/push/test') return respond({});

    // ================= CLIENT MODE =================

    // ---- Client auth ----
    if (url === '/client/auth/register' || url === '/client/auth/login') {
      return respond({
        access_token: 'mock-client-jwt',
        refresh_token: 'mock-client-refresh',
        client: db.client,
      });
    }
    if (url === '/client/auth/me' && method === 'get') return respond(db.client);
    if (url === '/client/auth/me' && method === 'patch') {
      Object.assign(db.client, body);
      return respond(db.client);
    }

    // ---- Discovery ----
    if (url === '/client/businesses' && method === 'get') {
      let items = db.directory.map(({ services: _s, ...pub }) => pub);
      if (params.q) {
        const q = params.q.toLowerCase();
        items = items.filter((b) => b.name.toLowerCase().includes(q));
      }
      if (params.industry) items = items.filter((b) => b.industry === params.industry);
      return respond({ items });
    }
    const availMatch = url.match(/^\/client\/businesses\/(.+)\/availability$/);
    if (availMatch) {
      const biz = db.directory.find((b) => b.business_id === availMatch[1]);
      const svc = biz?.services.find((s) => s.service_id === params.service_id);
      const duration = svc?.duration_minutes ?? 60;
      const slots: { start_time: string; end_time: string }[] = [];
      for (let h = 14; h + duration / 60 <= 24; h++) {
        const start = new Date(`${params.date}T00:00:00Z`);
        start.setUTCHours(h, 0, 0, 0);
        const end = new Date(start.getTime() + duration * 60_000);
        const overlaps = db.clientBookings.some(
          (b) =>
            b.business_id === availMatch[1] &&
            b.status === 'confirmed' &&
            new Date(b.start_time) < end &&
            new Date(b.end_time) > start,
        );
        if (!overlaps && start.getTime() > Date.now()) {
          slots.push({ start_time: start.toISOString(), end_time: end.toISOString() });
        }
      }
      return respond({ date: params.date, timezone: biz?.timezone ?? 'America/Chicago', slots });
    }
    const bizMatch = url.match(/^\/client\/businesses\/([^/]+)$/);
    if (bizMatch) {
      const biz = db.directory.find((b) => b.business_id === bizMatch[1]);
      if (!biz) throw mockError(404, 'not_found', 'Business not found', config);
      return respond(biz);
    }

    // ---- Client bookings ----
    if (url === '/client/bookings' && method === 'get') {
      let items = db.clientBookings;
      const now = new Date().toISOString();
      if (params.scope === 'upcoming') {
        items = items.filter((b) => b.start_time >= now && b.status === 'confirmed');
      }
      if (params.scope === 'past') {
        items = items.filter((b) => b.start_time < now || b.status !== 'confirmed');
      }
      return respond({ items: [...items].sort((a, b) => a.start_time.localeCompare(b.start_time)) });
    }
    if (url === '/client/bookings' && method === 'post') {
      const b = body as ClientCreateBookingRequest;
      const biz = db.directory.find((x) => x.business_id === b.business_id);
      const svc = biz?.services.find((s) => s.service_id === b.service_id);
      if (!biz || !svc) throw mockError(404, 'not_found', 'Business or service not found', config);
      const start = new Date(b.start_time);
      const end = new Date(start.getTime() + svc.duration_minutes * 60_000);
      const booking: ClientBooking = {
        booking_id: uid('cbk'),
        business_id: biz.business_id,
        business_name: biz.name,
        customer_id: 'cus-001',
        service_id: svc.service_id,
        service_name: svc.name,
        customer_name: db.client.name,
        customer_phone: db.client.phone,
        customer_email: db.client.email,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        timezone: biz.timezone,
        status: 'confirmed',
        deposit_paid: false,
        deposit_payment_id: null,
        deposit_amount_cents: svc.deposit_cents,
        deposit_refunded: false,
        notes: b.notes ?? '',
        created_by: 'app',
        created_at: new Date().toISOString(),
        cancellable_until: new Date(start.getTime() - 24 * 3_600_000).toISOString(),
      };
      db.clientBookings.push(booking);
      return respond(booking);
    }
    const cbkMatch = url.match(/^\/client\/bookings\/(.+)$/);
    if (cbkMatch) {
      const booking = db.clientBookings.find((b) => b.booking_id === cbkMatch[1]);
      if (!booking) throw mockError(404, 'not_found', 'Booking not found', config);
      if (method === 'get') return respond(booking);
      if (method === 'patch') {
        if (body.status === 'cancelled' && new Date() > new Date(booking.cancellable_until)) {
          throw mockError(
            422,
            'cancellation_window_passed',
            'This booking can no longer be cancelled',
            config,
          );
        }
        if (body.status) booking.status = body.status;
        if (body.start_time) {
          const dur = new Date(booking.end_time).getTime() - new Date(booking.start_time).getTime();
          booking.start_time = new Date(body.start_time).toISOString();
          booking.end_time = new Date(new Date(body.start_time).getTime() + dur).toISOString();
        }
        return respond(booking);
      }
    }

    // ---- Client payments / push ----
    if (url === '/client/payments/deposit') {
      const booking = db.clientBookings.find((b) => b.booking_id === body.booking_id);
      if (booking) {
        booking.deposit_paid = true;
        booking.deposit_payment_id = uid('pay');
      }
      return respond({
        payment_id: booking?.deposit_payment_id ?? uid('pay'),
        provider: 'stripe',
        client_secret: 'pi_mock_secret',
        amount_cents: booking?.deposit_amount_cents ?? 0,
      });
    }
    if (url === '/client/push/token') return respond({});

    throw mockError(404, 'not_found', `No mock for ${method.toUpperCase()} ${url}`, config);
  };
}

function mockError(
  status: number,
  code: string,
  message: string,
  config: InternalAxiosRequestConfig,
) {
  const err = new Error(message) as Error & { response: unknown; config: unknown; isAxiosError: boolean };
  err.isAxiosError = true;
  err.config = config;
  err.response = { status, data: { error: code, message } };
  return err;
}
