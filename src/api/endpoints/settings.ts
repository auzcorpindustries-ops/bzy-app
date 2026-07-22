import { api } from '../client';
import type { UpdateSettingsRequest } from '@/types/api';
import type { Business } from '@/types/models';

export const settingsApi = {
  async get(): Promise<Business> {
    const { data } = await api.get<Business>('/api/settings');
    return data;
  },

  async update(body: UpdateSettingsRequest): Promise<Business> {
    const { data } = await api.patch<Business>('/api/settings', body);
    return data;
  },
};
