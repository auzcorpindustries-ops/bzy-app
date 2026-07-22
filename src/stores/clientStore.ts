import { create } from 'zustand';
import { clientApi } from '@/api';
import type {
  BusinessDetail,
  BusinessPublicProfile,
  BusinessSearchParams,
  ClientBooking,
  ClientCreateBookingRequest,
} from '@/types/client';
import type { AvailableSlot } from '@/types/models';

interface ClientState {
  businesses: BusinessPublicProfile[];
  businessDetail: BusinessDetail | null;
  slots: AvailableSlot[];
  myBookings: ClientBooking[];
  isLoading: boolean;
  isLoadingSlots: boolean;
  error: string | null;
  searchBusinesses: (params?: BusinessSearchParams) => Promise<void>;
  fetchBusiness: (businessId: string) => Promise<void>;
  fetchSlots: (businessId: string, serviceId: string, date: string) => Promise<void>;
  fetchMyBookings: (scope?: 'upcoming' | 'past') => Promise<void>;
  createBooking: (body: ClientCreateBookingRequest) => Promise<ClientBooking>;
  cancelBooking: (bookingId: string) => Promise<void>;
  payDeposit: (bookingId: string) => Promise<void>;
}

export const useClientStore = create<ClientState>((set, get) => ({
  businesses: [],
  businessDetail: null,
  slots: [],
  myBookings: [],
  isLoading: false,
  isLoadingSlots: false,
  error: null,

  searchBusinesses: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const businesses = await clientApi.searchBusinesses(params);
      set({ businesses, isLoading: false });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
    }
  },

  fetchBusiness: async (businessId) => {
    set({ isLoading: true, businessDetail: null, error: null });
    try {
      const businessDetail = await clientApi.getBusiness(businessId);
      set({ businessDetail, isLoading: false });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
    }
  },

  fetchSlots: async (businessId, serviceId, date) => {
    set({ isLoadingSlots: true, slots: [] });
    try {
      const res = await clientApi.availability(businessId, serviceId, date);
      set({ slots: res.slots, isLoadingSlots: false });
    } catch (e) {
      set({ error: (e as Error).message, isLoadingSlots: false });
    }
  },

  fetchMyBookings: async (scope) => {
    set({ isLoading: true, error: null });
    try {
      const myBookings = await clientApi.myBookings(scope);
      set({ myBookings, isLoading: false });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
    }
  },

  createBooking: async (body) => {
    const booking = await clientApi.createBooking(body);
    set({ myBookings: [...get().myBookings, booking] });
    return booking;
  },

  cancelBooking: async (bookingId) => {
    const updated = await clientApi.cancelBooking(bookingId);
    set({
      myBookings: get().myBookings.map((b) => (b.booking_id === bookingId ? updated : b)),
    });
  },

  payDeposit: async (bookingId) => {
    await clientApi.createDeposit(bookingId);
    // In production: confirm with Stripe RN SDK / Square SDK using the returned
    // client_secret / token, then refresh the booking.
    set({
      myBookings: get().myBookings.map((b) =>
        b.booking_id === bookingId ? { ...b, deposit_paid: true } : b,
      ),
    });
  },
}));
