# Bzy — Proposed Client-Side API Contract

The tech doc covers the business-owner API only. This document proposes the
customer-facing ("client") API the mobile app's client mode is built against.
The app currently runs these against mocks; implement this contract on the
backend and the client mode works unchanged.

## Design principles

- Same conventions as the business API: JWT bearer auth, list responses as
  `{ "items": [...] }`, cents for money, ISO UTC timestamps.
- A **client** is a person with one Bzy account who can book at many
  businesses. On their first booking with a business, the backend creates (or
  links by phone) a row in that business's `bzy-customers` — the business side
  keeps working exactly as specced.
- Refresh is shared: `POST /auth/refresh` accepts refresh tokens for either
  role; the token's claims identify the subject (`client_id` vs `business_id`).

## New table: `bzy-clients`

```json
{
  "client_id": "uuid",
  "name": "Sarah Smith",
  "email": "sarah@example.com",
  "phone": "+15555550001",
  "password_hash": "bcrypt...",
  "created_at": "ISO",
  "status": "active"
}
```

Suggested GSI on `bzy-customers`: `client_id-index` (add nullable `client_id`
to customer rows) so "my bookings" queries don't fan out by phone.

## Endpoints

### Client auth

| Method | Path | Purpose |
|---|---|---|
| POST | `/client/auth/register` | `{ name, email, phone, password }` → `{ access_token, refresh_token, client }` |
| POST | `/client/auth/login` | `{ email, password }` → same shape |
| POST | `/auth/refresh` | Shared with business role |
| GET | `/client/auth/me` | Current client profile |
| PATCH | `/client/auth/me` | Update name / phone / email |

### Discovery (authenticated as client)

| Method | Path | Purpose |
|---|---|---|
| GET | `/client/businesses` | List/search businesses. Query: `q` (name), `industry` |
| GET | `/client/businesses/:id` | Business public profile + active services |

Public profile exposes only: `business_id, name, industry, timezone,
office_hours, deposit_required` + services (`service_id, name, description,
duration_minutes, price_cents, deposit_cents, category`). Never expose owner
contact info, payment account ids, or plan.

### Availability

| Method | Path | Purpose |
|---|---|---|
| GET | `/client/businesses/:id/availability` | Query: `service_id`, `date` (YYYY-MM-DD, business TZ) → `{ date, timezone, slots: [{start_time, end_time}] }` |

Backed by the same `calendarService.getAvailableSlots` the business API uses.

### Bookings

| Method | Path | Purpose |
|---|---|---|
| GET | `/client/bookings` | My bookings across businesses. Query: `scope=upcoming\|past` |
| POST | `/client/bookings` | `{ business_id, service_id, start_time, notes? }` — name/phone/email come from the client profile |
| GET | `/client/bookings/:id` | Booking detail (joined with business name) |
| PATCH | `/client/bookings/:id` | `{ status: "cancelled" }` or `{ start_time }` (reschedule). Server enforces `cancellation_policy_hours` |

Client booking responses add `business_name` and `cancellable_until` (ISO) to
the standard booking shape.

Creation flow server-side: validate slot (race-check) → upsert customer row
(match `client_id`, else phone) → write booking with `created_by: "app"` →
push-notify the business.

### Deposits

| Method | Path | Purpose |
|---|---|---|
| POST | `/client/payments/deposit` | `{ booking_id }` → `{ payment_id, provider, client_secret?/square_payment_token?, amount_cents }` |

Same response shape as the business deposit endpoint; the app pays via the
Stripe RN SDK or Square In-App Payments SDK depending on `provider`.

### Push

| Method | Path | Purpose |
|---|---|---|
| POST | `/client/push/token` | Register Expo push token for booking reminders/confirmations |

## Error shape

Same as business API: `{ "error": "code", "message": "human text" }` with
appropriate HTTP status. Notable codes the app handles: `slot_taken` (409 on
create), `cancellation_window_passed` (422 on cancel).
