// Client-side (customer) domain types. See docs/client-api-contract.md.
import type { AvailableSlot, Booking, Industry, Service } from './models';

export interface ClientUser {
  client_id: string;
  name: string;
  email: string;
  phone: string;
  created_at: string;
  status: 'active' | 'suspended';
}

export interface BusinessPublicProfile {
  business_id: string;
  name: string;
  industry: Industry;
  timezone: string;
  office_hours: string;
  deposit_required: boolean;
}

export interface BusinessDetail extends BusinessPublicProfile {
  services: ClientServiceView[];
}

export type ClientServiceView = Pick<
  Service,
  | 'service_id'
  | 'name'
  | 'description'
  | 'duration_minutes'
  | 'price_cents'
  | 'deposit_cents'
  | 'category'
>;

export interface ClientBooking extends Booking {
  business_name: string;
  cancellable_until: string; // ISO
}

// ---- Requests / responses ----
export interface ClientRegisterRequest {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export interface ClientLoginRequest {
  email: string;
  password: string;
}

export interface ClientAuthResponse {
  access_token: string;
  refresh_token: string;
  client: ClientUser;
}

export interface BusinessSearchParams {
  q?: string;
  industry?: Industry;
}

export interface ClientCreateBookingRequest {
  business_id: string;
  service_id: string;
  start_time: string; // ISO UTC
  notes?: string;
}

export interface ClientAvailabilityResponse {
  date: string;
  timezone: string;
  slots: AvailableSlot[];
}
