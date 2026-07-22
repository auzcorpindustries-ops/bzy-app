# Bzy — Mobile App (iOS + Android)

React Native + Expo app for the Bzy booking platform. Frontend and middleware
only; backend connection is a config change.

## Run it

```bash
npm install
npx expo start        # scan QR with Expo Go, or press i / a for simulators
```

The app ships in **mock mode**: a full in-memory backend
(`src/api/mock/adapter.ts`) implements every endpoint from the tech doc, so all
screens work with realistic latency and data before any backend exists.

## Connect your real backend

Set two env vars (e.g. in `.env`):

```
EXPO_PUBLIC_USE_MOCKS=false
EXPO_PUBLIC_API_BASE_URL=https://api.your-domain.com
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

Nothing else changes — the middleware (`src/api/`) already speaks the exact
API contract from `bzy-tech-architecture.md`: JWT bearer auth, automatic
refresh on 401 (single-flight), tokens in `expo-secure-store`.

## Structure

```
app/                  Expo Router screens
src/
  api/
    client.ts         axios instance, JWT + refresh interceptors
    tokenStorage.ts   expo-secure-store wrapper
    endpoints/        typed client per API group (auth, bookings, services,
                      customers, payments, aiAgent, settings, push)
    mock/             in-memory mock backend + fixtures
  stores/             Zustand stores (auth, bookings, services, customers, settings)
  types/              domain models + API request/response contracts
  utils/              formatting, push notification registration
  config/env.ts       API base URL / mock toggle
```

## Backend contract expected

Every endpoint, verb, and payload matches `bzy-tech-architecture.md`. List
endpoints return `{ "items": [...] }`; auth returns
`{ access_token, refresh_token, business }`; refresh takes
`{ refresh_token }` and returns `{ access_token }`.
