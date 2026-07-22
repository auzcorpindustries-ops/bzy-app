// Bzy domain models — mirror the DynamoDB schemas in bzy-tech-architecture.md

export type Industry = 'hair_salon' | 'nail_salon' | 'tattoo';
export type PaymentProvider = 'stripe' | 'square';
export type Plan = 'free' | 'pro' | 'elite';
export type DepositType = 'flat' | 'percentage';
export type BookingStatus = 'confirmed' | 'cancelled' | 'completed' | 'no_show';
export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded' | 'partially_refunded';
export type PaymentType = 'deposit' | 'subscription' | 'charge';
export type BookingCreatedBy = 'app' | 'ai_agent';

export interface Business {
  business_id: string;
  name: string;
  owner_name: string;
  owner_email: string;
  owner_phone: string;
  industry: Industry;
  timezone: string;
  office_hours: string;
  twilio_number: string | null;
  payment_provider: PaymentProvider;
  stripe_account_id: string | null;
  square_merchant_id: string | null;
  plan: Plan;
  ai_agent_enabled: boolean;
  deposit_required: boolean;
  deposit_amount: number;
  deposit_percentage: number;
  deposit_type: DepositType;
  booking_buffer_hours: number;
  cancellation_policy_hours: number;
  created_at: string;
  status: 'active' | 'suspended';
}

export interface Service {
  service_id: string;
  business_id: string;
  name: string;
  description: string;
  duration_minutes: number;
  price_cents: number;
  deposit_cents: number;
  category: string;
  active: boolean;
  created_at: string;
}

export interface Booking {
  booking_id: string;
  business_id: string;
  customer_id: string;
  service_id: string;
  service_name: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  start_time: string; // ISO UTC
  end_time: string; // ISO UTC
  timezone: string;
  status: BookingStatus;
  deposit_paid: boolean;
  deposit_payment_id: string | null;
  deposit_amount_cents: number;
  deposit_refunded: boolean;
  notes: string;
  created_by: BookingCreatedBy;
  created_at: string;
}

export interface Customer {
  customer_id: string;
  business_id: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  total_bookings: number;
  total_spent_cents: number;
  first_booking_at: string | null;
  last_booking_at: string | null;
  created_at: string;
}

export interface Payment {
  payment_id: string;
  business_id: string;
  booking_id: string;
  customer_id: string;
  type: PaymentType;
  amount_cents: number;
  provider: PaymentProvider;
  provider_payment_id: string;
  status: PaymentStatus;
  refund_amount_cents: number;
  created_at: string;
}

export interface AvailableSlot {
  start_time: string; // ISO UTC
  end_time: string; // ISO UTC
}

export interface AiAgentStatus {
  enabled: boolean;
  twilio_number: string | null;
  voice: string;
  greeting: string | null;
  minutes_used: number;
  minutes_included: number;
}
