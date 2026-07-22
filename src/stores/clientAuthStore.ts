import { create } from 'zustand';
import { clientAuthApi, tokenStorage } from '@/api';
import type { ClientLoginRequest, ClientRegisterRequest, ClientUser } from '@/types/client';

interface ClientAuthState {
  client: ClientUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (body: ClientLoginRequest) => Promise<void>;
  register: (body: ClientRegisterRequest) => Promise<void>;
  restore: () => Promise<boolean>;
  logout: () => Promise<void>;
  updateProfile: (body: Partial<Pick<ClientUser, 'name' | 'email' | 'phone'>>) => Promise<void>;
}

export const useClientAuthStore = create<ClientAuthState>((set) => ({
  client: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (body) => {
    set({ isLoading: true, error: null });
    try {
      const res = await clientAuthApi.login(body);
      await tokenStorage.setRole('client');
      set({ client: res.client, isAuthenticated: true, isLoading: false });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
      throw e;
    }
  },

  register: async (body) => {
    set({ isLoading: true, error: null });
    try {
      const res = await clientAuthApi.register(body);
      await tokenStorage.setRole('client');
      set({ client: res.client, isAuthenticated: true, isLoading: false });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
      throw e;
    }
  },

  /** Restore a client session on app launch. Returns true if restored. */
  restore: async () => {
    try {
      const client = await clientAuthApi.me();
      set({ client, isAuthenticated: true });
      return true;
    } catch {
      return false;
    }
  },

  logout: async () => {
    await clientAuthApi.logout();
    set({ client: null, isAuthenticated: false });
  },

  updateProfile: async (body) => {
    const client = await clientAuthApi.updateMe(body);
    set({ client });
  },
}));
