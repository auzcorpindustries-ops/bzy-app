import { api } from '../client';
import type { CustomerDetailResponse, CustomerListResponse } from '@/types/api';
import type { Customer } from '@/types/models';

export const customersApi = {
  async list(): Promise<Customer[]> {
    const { data } = await api.get<CustomerListResponse>('/api/customers');
    return data.items;
  },

  async get(customerId: string): Promise<CustomerDetailResponse> {
    const { data } = await api.get<CustomerDetailResponse>(`/api/customers/${customerId}`);
    return data;
  },
};
