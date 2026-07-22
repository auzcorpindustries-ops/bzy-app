import * as SecureStore from 'expo-secure-store';

const ACCESS_KEY = 'bzy_access_token';
const REFRESH_KEY = 'bzy_refresh_token';
const ROLE_KEY = 'bzy_role';

export type SessionRole = 'business' | 'client';

export const tokenStorage = {
  async getAccessToken(): Promise<string | null> {
    return SecureStore.getItemAsync(ACCESS_KEY);
  },
  async getRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync(REFRESH_KEY);
  },
  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_KEY, accessToken),
      SecureStore.setItemAsync(REFRESH_KEY, refreshToken),
    ]);
  },
  async setAccessToken(accessToken: string): Promise<void> {
    await SecureStore.setItemAsync(ACCESS_KEY, accessToken);
  },
  async getRole(): Promise<SessionRole | null> {
    return (await SecureStore.getItemAsync(ROLE_KEY)) as SessionRole | null;
  },
  async setRole(role: SessionRole): Promise<void> {
    await SecureStore.setItemAsync(ROLE_KEY, role);
  },
  async clear(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_KEY),
      SecureStore.deleteItemAsync(REFRESH_KEY),
      SecureStore.deleteItemAsync(ROLE_KEY),
    ]);
  },
};
