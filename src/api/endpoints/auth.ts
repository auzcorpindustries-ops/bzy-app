import { api } from '../client';
import { tokenStorage } from '../tokenStorage';
import type { AuthResponse, LoginRequest, RegisterRequest } from '@/types/api';
import type { Business } from '@/types/models';

export const authApi = {
  async register(body: RegisterRequest): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/register', body);
    await tokenStorage.setTokens(data.access_token, data.refresh_token);
    return data;
  },

  async login(body: LoginRequest): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/login', body);
    await tokenStorage.setTokens(data.access_token, data.refresh_token);
    return data;
  },

  async me(): Promise<Business> {
    const { data } = await api.get<Business>('/auth/me');
    return data;
  },

  async logout(): Promise<void> {
    await tokenStorage.clear();
  },
};
