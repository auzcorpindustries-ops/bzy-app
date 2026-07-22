// Request/response contracts for every endpoint in the tech doc.
import type {
  AiAgentStatus,
  AvailableSlot,
  Booking,
  BookingStatus,
  Business,
  Customer,
  Payment,
  PaymentProvider,
  Service,
} from './models';

// ---- Auth ----
export interface RegisterRequest {
  email: string;
  password: string;
  business_name: string;
  owner_name: string;
  owner_phone: string;
  industry: Business['industry'];
  timezone: string;
  payment_provider: PaymentProvider;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthTokens {
  access_token: string; // JWT, 15 min
  refresh_token: string; // 30 days
}

export interface AuthResponse extends AuthTokens {
  business: Business;
}

// ---- Services ----
export interface CreateServiceRequest {
  name: string;
  description?: string;
  duration_minutes: number;
  price_cents: number;
  deposit_cents?: number;
  category?: string;
}
export type UpdateServiceRequest = Partial<CreateServiceRequest> & { active?: boolean };

// ---- Bookings ----
export interface ListBookingsParams {
  start_date?: string; // ISO date
  end_date?: string; // ISO date
  status?: BookingStatus;
}

export interface CreateBookingRequest {
  service_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  start_time: string; // ISO UTC
  notes?: string;
}

export interface UpdateBookingRequest {
  start_time?: string; // reschedule
  status?: BookingStatus; // cancel / complete / no_show
  notes?: string;
}

export interface AvailabilityParams {
  service_id: string;
  date: string; // YYYY-MM-DD in business timezone
}

export interface AvailabilityResponse {
  date: string;
  timezone: string;
  slots: AvailableSlot[];
}

// ---- Payments ----
export interface CreateDepositRequest {
  booking_id: string;
}

export interface CreateDepositResponse {
  payment_id: string;
  provider: PaymentProvider;
  // Stripe
  client_secret?: string;
  // Square
  square_payment_token?: string;
  amount_cents: number;
}

export interface RefundResponse {
  payment: Payment;
}

// ---- AI Agent ----
export interface AiAgentSettingsRequest {
  voice?: string;
  greeting?: string;
  hours?: string;
}

// ---- Settings ----
export interface UpdateSettingsRequest {
  name?: string;
  office_hours?: string;
  timezone?: string;
  deposit_required?: boolean;
  deposit_type?: Business['deposit_type'];
  deposit_amount?: number;
  deposit_percentage?: number;
  booking_buffer_hours?: number;
  cancellation_policy_hours?: number;
  payment_provider?: PaymentProvider;
}

// ---- Push ----
export interface RegisterPushTokenRequest {
  token: string; // Expo push token
  platform: 'ios' | 'android';
}

// ---- Shared ----
export interface ApiError {
  error: string;
  message: string;
  status: number;
}

export type ListResponse<T> = { items: T[] };
export type BookingListResponse = ListResponse<Booking>;
export type ServiceListResponse = ListResponse<Service>;
export type CustomerListResponse = ListResponse<Customer>;
export interface CustomerDetailResponse {
  customer: Customer;
  bookings: Booking[];
}
export type { AiAgentStatus };
