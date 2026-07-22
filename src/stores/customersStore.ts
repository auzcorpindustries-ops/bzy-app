import { create } from 'zustand';
import { customersApi } from '@/api';
import type { Booking, Customer } from '@/types/models';

interface CustomersState {
  customers: Customer[];
  selected: { customer: Customer; bookings: Booking[] } | null;
  isLoading: boolean;
  error: string | null;
  fetch: () => Promise<void>;
  fetchDetail: (customerId: string) => Promise<void>;
}

export const useCustomersStore = create<CustomersState>((set) => ({
  customers: [],
  selected: null,
  isLoading: false,
  error: null,

  fetch: async () => {
    set({ isLoading: true, error: null });
    try {
      const customers = await customersApi.list();
      set({ customers, isLoading: false });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
    }
  },

  fetchDetail: async (customerId) => {
    set({ isLoading: true, selected: null });
    try {
      const detail = await customersApi.get(customerId);
      set({ selected: detail, isLoading: false });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
    }
  },
}));
