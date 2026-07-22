import type { BusinessDetail, ClientBooking, ClientUser } from '@/types/client';

export const mockClient: ClientUser = {
  client_id: 'cli-001',
  name: 'Sarah Smith',
  email: 'sarah@example.com',
  phone: '+15555550001',
  created_at: '2026-03-01T00:00:00Z',
  status: 'active',
};

export const mockBusinessDirectory: BusinessDetail[] = [
  {
    business_id: 'biz-001',
    name: 'Glow Hair Studio',
    industry: 'hair_salon',
    timezone: 'America/Chicago',
    office_hours: 'Mon-Sat 9am-7pm',
    deposit_required: true,
    services: [
      { service_id: 'svc-001', name: "Women's Haircut", description: 'Wash, cut, and style', duration_minutes: 60, price_cents: 4500, deposit_cents: 500, category: 'haircut' },
      { service_id: 'svc-002', name: 'Full Color', description: 'Single-process color, root to tip', duration_minutes: 120, price_cents: 12000, deposit_cents: 2000, category: 'color' },
      { service_id: 'svc-003', name: 'Blowout', description: 'Wash and blowout style', duration_minutes: 45, price_cents: 3500, deposit_cents: 0, category: 'style' },
    ],
  },
  {
    business_id: 'biz-002',
    name: 'Polished Nail Bar',
    industry: 'nail_salon',
    timezone: 'America/Chicago',
    office_hours: 'Tue-Sun 10am-8pm',
    deposit_required: false,
    services: [
      { service_id: 'svc-101', name: 'Gel Manicure', description: 'Gel polish, cuticle care, shape', duration_minutes: 45, price_cents: 5500, deposit_cents: 0, category: 'manicure' },
      { service_id: 'svc-102', name: 'Spa Pedicure', description: 'Soak, scrub, massage, polish', duration_minutes: 60, price_cents: 6500, deposit_cents: 0, category: 'pedicure' },
    ],
  },
  {
    business_id: 'biz-003',
    name: 'Iron & Ink Tattoo',
    industry: 'tattoo',
    timezone: 'America/Chicago',
    office_hours: 'Wed-Sun 12pm-9pm',
    deposit_required: true,
    services: [
      { service_id: 'svc-201', name: 'Small Tattoo (up to 2hr)', description: 'Custom piece up to palm size', duration_minutes: 120, price_cents: 25000, deposit_cents: 5000, category: 'tattoo' },
      { service_id: 'svc-202', name: 'Consultation', description: 'Design consult with your artist', duration_minutes: 30, price_cents: 0, deposit_cents: 0, category: 'consult' },
    ],
  },
];

function daysFromNowAt(days: number, hourUtc: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(hourUtc, 0, 0, 0);
  return d.toISOString();
}

export const mockClientBookings: ClientBooking[] = [
  {
    booking_id: 'cbk-001',
    business_id: 'biz-001',
    business_name: 'Glow Hair Studio',
    customer_id: 'cus-001',
    service_id: 'svc-001',
    service_name: "Women's Haircut",
    customer_name: 'Sarah Smith',
    customer_phone: '+15555550001',
    customer_email: 'sarah@example.com',
    start_time: daysFromNowAt(2, 16),
    end_time: daysFromNowAt(2, 17),
    timezone: 'America/Chicago',
    status: 'confirmed',
    deposit_paid: true,
    deposit_payment_id: 'pay-c01',
    deposit_amount_cents: 500,
    deposit_refunded: false,
    notes: '',
    created_by: 'app',
    created_at: '2026-07-15T00:00:00Z',
    cancellable_until: daysFromNowAt(1, 16),
  },
  {
    booking_id: 'cbk-002',
    business_id: 'biz-002',
    business_name: 'Polished Nail Bar',
    customer_id: 'cus-x02',
    service_id: 'svc-101',
    service_name: 'Gel Manicure',
    customer_name: 'Sarah Smith',
    customer_phone: '+15555550001',
    customer_email: 'sarah@example.com',
    start_time: daysFromNowAt(-14, 17),
    end_time: daysFromNowAt(-14, 18),
    timezone: 'America/Chicago',
    status: 'completed',
    deposit_paid: false,
    deposit_payment_id: null,
    deposit_amount_cents: 0,
    deposit_refunded: false,
    notes: '',
    created_by: 'app',
    created_at: '2026-06-30T00:00:00Z',
    cancellable_until: daysFromNowAt(-15, 17),
  },
];
