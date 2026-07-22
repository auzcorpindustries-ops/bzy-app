import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL, USE_MOCKS } from '@/config/env';
import { tokenStorage } from './tokenStorage';
import { installMockAdapter } from './mock/adapter';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

if (USE_MOCKS) {
  installMockAdapter(api);
}

// ---- Attach JWT ----
api.interceptors.request.use(async (config) => {
  const token = await tokenStorage.getAccessToken();
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---- Auto-refresh on 401 (single-flight) ----
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await tokenStorage.getRefreshToken();
  if (!refreshToken) return null;
  try {
    // Bare axios: avoid our own interceptors recursing.
    const { data } = await axios.post<{ access_token: string }>(
      `${API_BASE_URL}/auth/refresh`,
      { refresh_token: refreshToken },
      { timeout: 15_000 },
    );
    await tokenStorage.setAccessToken(data.access_token);
    return data.access_token;
  } catch {
    await tokenStorage.clear();
    onSessionExpired?.();
    return null;
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retried?: boolean })
      | undefined;

    if (
      error.response?.status === 401 &&
      original &&
      !original._retried &&
      !original.url?.startsWith('/auth/')
    ) {
      original._retried = true;
      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
      const newToken = await refreshPromise;
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
    }
    return Promise.reject(normalizeError(error));
  },
);

// ---- Session-expiry hook (auth store registers a logout handler) ----
let onSessionExpired: (() => void) | null = null;
export function setSessionExpiredHandler(fn: () => void) {
  onSessionExpired = fn;
}

// ---- Error normalization ----
export class BzyApiError extends Error {
  status: number;
  code: string;
  constructor(message: string, status: number, code: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function normalizeError(error: AxiosError): BzyApiError {
  const data = error.response?.data as
    | { error?: string; message?: string }
    | undefined;
  return new BzyApiError(
    data?.message ?? error.message ?? 'Something went wrong',
    error.response?.status ?? 0,
    data?.error ?? 'network_error',
  );
}
