// Environment config. Point API_BASE_URL at your backend when it's ready.
// While USE_MOCKS is true the app runs fully offline against fixture data,
// so the frontend is testable before the backend exists.

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://api.bzy.app';

export const USE_MOCKS =
  (process.env.EXPO_PUBLIC_USE_MOCKS ?? 'true') === 'true';

export const STRIPE_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';
