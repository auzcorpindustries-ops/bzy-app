import { api } from '../client';
import type { RegisterPushTokenRequest } from '@/types/api';

export const pushApi = {
  async registerToken(body: RegisterPushTokenRequest): Promise<void> {
    await api.post('/api/push/token', body);
  },

  async sendTest(): Promise<void> {
    await api.post('/api/push/test');
  },
};
