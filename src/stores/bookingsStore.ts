import { create } from 'zustand';
import { bookingsApi } from '@/api';
import type { CreateBookingRequest, ListBookingsParams, UpdateBookingRequest } from '@/types/api';
import type { AvailableSlot, Booking } from '@/types/models';

interface BookingsState {
  bookings: Booking[];
  slots: AvailableSlot[];
  isLoading: boolean;
  isLoadingSlots: boolean;
  error: string | null;
  fetch: (params?: ListBookingsParams) => Promise<void>;
  fetchSlots: (serviceId: string, date: string) => Promise<void>;
  create: (body: CreateBookingRequest) => Promise<Booking>;
  update: (bookingId: string, body: UpdateBookingRequest) => Promise<Booking>;
  cancel: (bookingId: string) => Promise<void>;
}

export const useBookingsStore = create<BookingsState>((set, get) => ({
  bookings: [],
  slots: [],
  isLoading: false,
  isLoadingSlots: false,
  error: null,

  fetch: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const bookings = await bookingsApi.list(params);
      set({ bookings, isLoading: false });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
    }
  },

  fetchSlots: async (serviceId, date) => {
    set({ isLoadingSlots: true, slots: [] });
    try {
      const res = await bookingsApi.availability({ service_id: serviceId, date });
      set({ slots: res.slots, isLoadingSlots: false });
    } catch (e) {
      set({ error: (e as Error).message, isLoadingSlots: false });
    }
  },

  create: async (body) => {
    const booking = await bookingsApi.create(body);
    set({ bookings: [...get().bookings, booking] });
    return booking;
  },

  update: async (bookingId, body) => {
    const updated = await bookingsApi.update(bookingId, body);
    set({
      bookings: get().bookings.map((b) => (b.booking_id === bookingId ? updated : b)),
    });
    return updated;
  },

  cancel: async (bookingId) => {
    await get().update(bookingId, { status: 'cancelled' });
  },
}));
