import { api } from '../client';
import type {
  AvailabilityParams,
  AvailabilityResponse,
  BookingListResponse,
  CreateBookingRequest,
  ListBookingsParams,
  UpdateBookingRequest,
} from '@/types/api';
import type { Booking } from '@/types/models';

export const bookingsApi = {
  async list(params?: ListBookingsParams): Promise<Booking[]> {
    const { data } = await api.get<BookingListResponse>('/api/bookings', { params });
    return data.items;
  },

  async get(bookingId: string): Promise<Booking> {
    const { data } = await api.get<Booking>(`/api/bookings/${bookingId}`);
    return data;
  },

  async create(body: CreateBookingRequest): Promise<Booking> {
    const { data } = await api.post<Booking>('/api/bookings', body);
    return data;
  },

  async update(bookingId: string, body: UpdateBookingRequest): Promise<Booking> {
    const { data } = await api.patch<Booking>(`/api/bookings/${bookingId}`, body);
    return data;
  },

  async cancel(bookingId: string): Promise<Booking> {
    return this.update(bookingId, { status: 'cancelled' });
  },

  async availability(params: AvailabilityParams): Promise<AvailabilityResponse> {
    const { data } = await api.get<AvailabilityResponse>('/api/bookings/availability', { params });
    return data;
  },
};
