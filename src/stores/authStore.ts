import { create } from 'zustand';
import { authApi, setSessionExpiredHandler, tokenStorage } from '@/api';
import type { LoginRequest, RegisterRequest } from '@/types/api';
import type { Business } from '@/types/models';

interface AuthState {
  business: Business | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  isLoading: boolean;
  error: string | null;
  bootstrap: () => Promise<void>;
  login: (body: LoginRequest) => Promise<void>;
  register: (body: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  setBusiness: (business: Business) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  business: null,
  isAuthenticated: false,
  isBootstrapping: true,
  isLoading: false,
  error: null,

  /** Called once on app launch: restore session from secure-store. */
  bootstrap: async () => {
    try {
      const token = await tokenStorage.getAccessToken();
      if (!token) {
        set({ isBootstrapping: false });
        return;
      }
      const business = await authApi.me();
      set({ business, isAuthenticated: true, isBootstrapping: false });
    } catch {
      await tokenStorage.clear();
      set({ business: null, isAuthenticated: false, isBootstrapping: false });
    }
  },

  login: async (body) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authApi.login(body);
      set({ business: res.business, isAuthenticated: true, isLoading: false });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
      throw e;
    }
  },

  register: async (body) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authApi.register(body);
      set({ business: res.business, isAuthenticated: true, isLoading: false });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
      throw e;
    }
  },

  logout: async () => {
    await authApi.logout();
    set({ business: null, isAuthenticated: false });
  },

  setBusiness: (business) => set({ business }),
}));

// Refresh-token failure anywhere in the app logs the user out.
setSessionExpiredHandler(() => {
  useAuthStore.setState({ business: null, isAuthenticated: false });
});
