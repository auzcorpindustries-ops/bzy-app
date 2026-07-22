import { create } from 'zustand';
import { servicesApi } from '@/api';
import type { CreateServiceRequest, UpdateServiceRequest } from '@/types/api';
import type { Service } from '@/types/models';

interface ServicesState {
  services: Service[];
  isLoading: boolean;
  error: string | null;
  fetch: () => Promise<void>;
  create: (body: CreateServiceRequest) => Promise<Service>;
  update: (serviceId: string, body: UpdateServiceRequest) => Promise<Service>;
  remove: (serviceId: string) => Promise<void>;
}

export const useServicesStore = create<ServicesState>((set, get) => ({
  services: [],
  isLoading: false,
  error: null,

  fetch: async () => {
    set({ isLoading: true, error: null });
    try {
      const services = await servicesApi.list();
      set({ services, isLoading: false });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
    }
  },

  create: async (body) => {
    const service = await servicesApi.create(body);
    set({ services: [...get().services, service] });
    return service;
  },

  update: async (serviceId, body) => {
    const updated = await servicesApi.update(serviceId, body);
    set({
      services: get().services.map((s) => (s.service_id === serviceId ? updated : s)),
    });
    return updated;
  },

  remove: async (serviceId) => {
    await servicesApi.remove(serviceId);
    set({ services: get().services.filter((s) => s.service_id !== serviceId) });
  },
}));
