import { api } from '../client';
import type { CreateServiceRequest, ServiceListResponse, UpdateServiceRequest } from '@/types/api';
import type { Service } from '@/types/models';

export const servicesApi = {
  async list(): Promise<Service[]> {
    const { data } = await api.get<ServiceListResponse>('/api/services');
    return data.items;
  },

  async create(body: CreateServiceRequest): Promise<Service> {
    const { data } = await api.post<Service>('/api/services', body);
    return data;
  },

  async update(serviceId: string, body: UpdateServiceRequest): Promise<Service> {
    const { data } = await api.patch<Service>(`/api/services/${serviceId}`, body);
    return data;
  },

  async remove(serviceId: string): Promise<void> {
    await api.delete(`/api/services/${serviceId}`);
  },
};
