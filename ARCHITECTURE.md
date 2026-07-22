# Bzy — Technical Architecture & Roadmap

## Product Summary

**Bzy** is a mobile-first booking app for hair salons, nail salons, and tattoo artists. It handles bookings, deposits, and transactions (Stripe or Square), with an optional AI phone agent powered by GPT-4o Realtime. Unlike Auzora, Bzy has its own built-in calendar (no external calendar integrations), uses push notifications instead of SMS, and is a distinct product with its own branding, infrastructure, and database.

## Decisions

| Decision | Choice |
|---|---|
| Mobile framework | React Native + Expo |
| Payments | Stripe + Square (business chooses at setup) |
| AI phone agent | Separate paid tier (opt-in, not default) |
| AI approach | GPT-4o Realtime (WebSocket bridge, same as Auzora) |
| Business model | Monthly SaaS subscription (tiered pricing) |
| SMS | None — push notifications only via the mobile app |
| Build phase | Production from day one — multi-tenant, secure auth, isolated infra |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Mobile App                        │
│              React Native + Expo                     │
│  (Business owner dashboard, booking calendar,       │
│   settings, payments, AI agent config)               │
└──────────────┬──────────────────┬───────────────────┘
               │                  │
         REST API           Push Notifications
         (HTTPS)            (Expo Push / APNs / FCM)
               │
┌──────────────▼──────────────────────────────────────┐
│                  Bzy Backend                         │
│              Node.js / Express                       │
│              EC2 (us-east-2)                         │
│                                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │ Booking  │ │ Payment  │ │ AI Agent │            │
│  │ Service  │ │ Service  │ │ Service  │            │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘            │
│       │            │            │                    │
│  ┌────▼────────────▼────────────▼─────┐             │
│  │         DynamoDB (bzy-*)           │             │
│  │  bzy-businesses                    │             │
│  │  bzy-bookings                      │             │
│  │  bzy-customers                     │             │
│  │  bzy-payments                      │             │
│  │  bzy-services                      │             │
│  │  bzy-number-queue                  │             │
│  └────────────────────────────────────┘             │
│                                                      │
│  External: Twilio | OpenAI | Stripe | Square        │
└─────────────────────────────────────────────────────┘
```

## AWS Infrastructure (completely separate from Auzora)

| Resource | Name | Purpose |
|---|---|---|
| EC2 | `bzy-ec2` | App server (Node.js, Docker) |
| Route53 | `bzy.app` (or similar) | Domain + SSL via nginx |
| DynamoDB | `bzy-businesses` | Business records (PK: `business_id`) |
| DynamoDB | `bzy-bookings` | Appointment records (PK: `booking_id`, GSI: `business_id-index`) |
| DynamoDB | `bzy-customers` | Customer profiles per business (PK: `customer_id`, GSI: `business_id-index`) |
| DynamoDB | `bzy-services` | Service catalog per business (PK: `service_id`, GSI: `business_id-index`) |
| DynamoDB | `bzy-payments` | Deposit/transaction records (PK: `payment_id`, GSI: `business_id-index`) |
| DynamoDB | `bzy-number-queue` | Pre-purchased Twilio numbers |
| Secrets Manager | `bzy/env` | All API keys, Stripe/Square secrets, JWT secret |
| SNS | `bzy-alerts` | Operator alerts (optional, for monitoring) |

## Tech Stack

### Backend

| Component | Technology |
|---|---|
| Runtime | Node.js 20, Express 4 |
| Database | DynamoDB (@aws-sdk/lib-dynamodb) |
| AI Phone | GPT-4o Realtime (WebSocket bridge) |
| TTS | ElevenLabs (fallback: OpenAI TTS) |
| Phone provisioning | Twilio number search + webhook setup |
| Business hours | chrono-node parser + validator |
| Email | Resend |
| Auth | JWT + refresh tokens |
| Payments | Stripe + Square (both, business chooses) |
| Calendar | Built-in (DynamoDB-based, no external calendar) |
| Push notifications | Expo Push |
| Logging | Winston |
| Container | Docker on EC2 |

### Mobile App

| Component | Technology |
|---|---|
| Framework | React Native (Expo SDK 52+) |
| Navigation | Expo Router |
| State | Zustand or React Context |
| API client | fetch / axios with JWT interceptor |
| Push notifications | expo-notifications |
| Auth storage | expo-secure-store (JWT + refresh token) |
| Calendar UI | react-native-calendars or custom |
| Payments UI | Stripe React Native SDK / Square In-App Payments SDK |

### External Services

| Service | Purpose | Notes |
|---|---|---|
| Twilio | Phone numbers + voice webhooks | Separate Twilio sub-account or project |
| OpenAI | GPT-4o Realtime API | Same API, separate key |
| ElevenLabs | TTS for non-realtime path | Same, separate key |
| Stripe | Card payments + deposits | Separate Stripe account |
| Square | Card payments + deposits | Separate Square app |
| Resend | Transactional email | Separate API key |
| Expo | Push notifications + OTA updates | New Expo project |

---

## Data Model

### `bzy-businesses`

```json
{
  "business_id": "uuid",
  "name": "Glow Hair Studio",
  "owner_name": "Jane Doe",
  "owner_email": "jane@glowhair.com",
  "owner_phone": "+15555551234",
  "password_hash": "bcrypt...",
  "industry": "hair_salon",
  "timezone": "America/Chicago",
  "office_hours": "Mon-Sat 9am-7pm",
  "twilio_number": null,
  "payment_provider": "stripe",
  "stripe_account_id": null,
  "square_merchant_id": null,
  "plan": "free",
  "ai_agent_enabled": false,
  "deposit_required": false,
  "deposit_amount": 0,
  "deposit_percentage": 0,
  "deposit_type": "flat",
  "booking_buffer_hours": 2,
  "cancellation_policy_hours": 24,
  "created_at": "ISO",
  "status": "active"
}
```

### `bzy-services`

```json
{
  "service_id": "uuid",
  "business_id": "uuid",
  "name": "Women's Haircut",
  "description": "Wash, cut, and style",
  "duration_minutes": 60,
  "price_cents": 4500,
  "deposit_cents": 500,
  "category": "haircut",
  "active": true,
  "created_at": "ISO"
}
```

### `bzy-bookings`

```json
{
  "booking_id": "uuid",
  "business_id": "uuid",
  "customer_id": "uuid",
  "service_id": "uuid",
  "service_name": "Women's Haircut",
  "customer_name": "Sarah Smith",
  "customer_phone": "+15555551234",
  "customer_email": "sarah@example.com",
  "start_time": "2026-07-25T14:00:00Z",
  "end_time": "2026-07-25T15:00:00Z",
  "timezone": "America/Chicago",
  "status": "confirmed",
  "deposit_paid": false,
  "deposit_payment_id": null,
  "deposit_amount_cents": 500,
  "deposit_refunded": false,
  "notes": "",
  "created_by": "app",
  "created_at": "ISO"
}
```

### `bzy-customers`

```json
{
  "customer_id": "uuid",
  "business_id": "uuid",
  "name": "Sarah Smith",
  "phone": "+15555551234",
  "email": "sarah@example.com",
  "notes": "Prefers afternoon appointments",
  "total_bookings": 5,
  "total_spent_cents": 22500,
  "first_booking_at": "ISO",
  "last_booking_at": "ISO",
  "created_at": "ISO"
}
```

### `bzy-payments`

```json
{
  "payment_id": "uuid",
  "business_id": "uuid",
  "booking_id": "uuid",
  "customer_id": "uuid",
  "type": "deposit",
  "amount_cents": 500,
  "provider": "stripe",
  "provider_payment_id": "pi_...",
  "status": "succeeded",
  "refund_amount_cents": 0,
  "created_at": "ISO"
}
```

---

## Built-in Calendar Service

Since Bzy doesn't integrate external calendars, this is a new service. Key design:

```js
// src/services/calendarService.js

// Get all bookings for a business in a date range
async function getBookingsByDateRange(businessId, startDate, endDate) {
  // Query bzy-bookings GSI by business_id, filter by start_time
}

// Check if a time slot is available
async function isSlotAvailable(businessId, startTime, endTime) {
  // 1. Check business hours (reuse businessHours.js)
  // 2. Check existing bookings in bzy-bookings (no overlap)
  // 3. Check booking buffer (minimum notice)
}

// Get available slots for a date
async function getAvailableSlots(businessId, serviceId, date, timezone) {
  // 1. Parse business hours for this day
  // 2. Get all bookings for this date from DynamoDB
  // 3. Walk the day, find gaps that fit the service duration
  // 4. Return slot list
}

// Create a booking
async function createBooking(businessId, bookingData) {
  // 1. Validate slot is still available (race condition check)
  // 2. Write to bzy-bookings
  // 3. If deposit required, create payment intent
  // 4. Send push notification to business
}
```

Key difference from Auzora: Instead of querying Google Calendar FreeBusy, Bzy queries its own `bzy-bookings` table. This is simpler — no OAuth, no calendar API, no timezone offset bugs. Bookings ARE the calendar.

---

## AI Phone Agent (separate tier)

When a business enables the AI agent tier:

1. **Twilio number provisioning** — search, purchase, wire webhooks to Bzy's EC2
2. **System prompt builder** — adapted from Auzora's realtime module, but:
   - Reads services from `bzy-services` instead of `service_durations`
   - Books into `bzy-bookings` via `calendarService.createBooking()` instead of Google Calendar
   - Handles deposit mention (AI tells caller about deposit, payment happens in-app or via push notification)
3. **WebSocket bridge** — Twilio WS <-> OpenAI Realtime WS (same pattern as Auzora)
4. **Booking flow** — AI calls a `book_appointment` tool that writes to Bzy's DynamoDB tables

### What's reusable from Auzora

- WebSocket bridge structure (openaiRealtime.js)
- Audio conversion: mu-law <-> PCM16 (audioUtils.js)
- Twilio number search/purchase pattern (twilioProvision.js)
- Hours parser (businessHours.js)
- TTS fallback (elevenlabs.js)
- Voice selection (voiceCatalog.js)
- Text normalization (speechNormalize.js)
- Email/name spelling capture (spellingCapture.js)

### What's new

- Booking tool writes to `bzy-bookings` (not Google Calendar)
- No calendarProvider.js abstraction — direct DynamoDB queries
- No SMS (no smsService.js, no bookingFormRouter.js)
- No approval email flow (bookings are direct, not pending host approval)

---

## Payment Flow

### Stripe Path

```
Business signs up -> Stripe Connect Standard account created
  -> Customer books a service with deposit
  -> Create PaymentIntent for deposit amount
  -> Customer pays in-app via Stripe React Native SDK
  -> Webhook: payment_intent.succeeded -> mark deposit_paid on booking
  -> On cancellation (within policy window): refund via Stripe API
  -> On no-show: deposit captured, business notified
```

### Square Path

```
Business signs up -> Square OAuth flow
  -> Customer books a service with deposit
  -> Create Square payment for deposit amount
  -> Customer pays in-app via Square In-App Payments SDK
  -> Webhook: payment.updated -> mark deposit_paid on booking
  -> On cancellation: refund via Square API
  -> On no-show: deposit captured
```

### Subscription (Bzy's own revenue)

```
Business subscribes to Bzy plan
  -> Stripe Checkout (subscription mode)
  -> Webhook: checkout.session.completed -> activate business
```

---

## Auth System

```
Mobile app -> POST /auth/register (email, password, business info)
  -> Create business record with bcrypt password hash
  -> Return JWT (15 min) + refresh token (30 days)

Mobile app -> POST /auth/login (email, password)
  -> Verify bcrypt hash
  -> Return JWT + refresh token

Mobile app -> POST /auth/refresh (refresh token)
  -> Verify refresh token
  -> Return new JWT

All API requests -> Authorization: Bearer <jwt>
  -> Middleware verifies JWT, sets req.businessId
```

Tokens stored in `expo-secure-store` on the device. JWT contains `business_id` and `plan`.

---

## API Endpoints

### Auth

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/register` | Create business account |
| POST | `/auth/login` | Login, get JWT + refresh |
| POST | `/auth/refresh` | Refresh JWT |
| GET | `/auth/me` | Get current business profile |

### Services

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/services` | List business's services |
| POST | `/api/services` | Create service |
| PATCH | `/api/services/:id` | Update service |
| DELETE | `/api/services/:id` | Delete service |

### Bookings

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/bookings` | List bookings (with date range filter) |
| POST | `/api/bookings` | Create booking |
| GET | `/api/bookings/:id` | Get booking details |
| PATCH | `/api/bookings/:id` | Update booking (reschedule, cancel) |
| GET | `/api/bookings/availability` | Get available slots for a date + service |

### Customers

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/customers` | List customers |
| GET | `/api/customers/:id` | Get customer details + booking history |

### Payments

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/payments/deposit` | Create payment intent for deposit |
| POST | `/api/payments/webhook/stripe` | Stripe webhook |
| POST | `/api/payments/webhook/square` | Square webhook |
| POST | `/api/payments/:id/refund` | Refund a deposit |

### AI Agent

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/ai-agent/enable` | Enable AI agent tier (provisions Twilio number) |
| POST | `/api/ai-agent/disable` | Disable AI agent |
| GET | `/api/ai-agent/status` | Get AI agent config |
| PATCH | `/api/ai-agent/settings` | Update AI agent settings (voice, prompt, hours) |
| POST | `/call/inbound` | Twilio webhook (voice) |
| POST | `/call/status` | Twilio webhook (call status) |
| WS | `/call/stream` | WebSocket bridge for Realtime API |

### Settings

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/settings` | Get business settings |
| PATCH | `/api/settings` | Update business settings (hours, deposit, etc.) |

### Push Notifications

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/push/token` | Register Expo push token |
| POST | `/api/push/test` | Send test notification |

---

## Roadmap

### Phase 1 — Backend Foundation (Weeks 1-3)

| Week | Deliverable |
|---|---|
| 1 | EC2 setup, Docker, nginx, Route53. DynamoDB tables created. Auth system (register/login/refresh JWT). Business settings CRUD. |
| 2 | Services CRUD. Calendar service (availability queries, slot computation, booking creation). Booking CRUD with race-condition prevention. |
| 3 | Stripe subscription webhook (Bzy's own revenue). Payment service scaffold (deposit intents). Customer records auto-creation on booking. |

Deliverable: Backend API fully functional for bookings and services. Testable via curl/Postman.

### Phase 2 — Mobile App (Weeks 4-7)

| Week | Deliverable |
|---|---|
| 4 | Expo project setup. Auth screens (login, register). Navigation structure. JWT storage in secure-store. API client with auth interceptor. |
| 5 | Dashboard screen (today's bookings, stats). Service management screen (create/edit/delete services). Booking calendar view (date picker + available slots). |
| 6 | Booking flow (select service, pick date, pick slot, confirm). Customer management screen. Settings screen (business hours, deposit config). |
| 7 | Stripe React Native SDK integration (in-app deposit payment). Square In-App Payments SDK integration. Push notification registration + handling. |

Deliverable: Functional mobile app on iOS + Android (TestFlight + internal testing track).

### Phase 3 — AI Phone Agent (Weeks 8-10)

| Week | Deliverable |
|---|---|
| 8 | Twilio number provisioning (adapted from Auzora). WebSocket bridge (adapted from openaiRealtime.js). System prompt builder for Bzy's data model. |
| 9 | AI booking tool (writes to bzy-bookings via calendarService). AI agent settings screen in mobile app. AI agent enable/disable flow (provisions Twilio number on enable). |
| 10 | Voice selection (reuse voiceCatalog.js). Speech normalization (reuse speechNormalize.js). Testing with live calls. Deposit mention in AI flow. |

Deliverable: AI phone agent working end-to-end. Callers can book via phone, booking appears in the app.

### Phase 4 — Payments & Deposits (Weeks 11-12)

| Week | Deliverable |
|---|---|
| 11 | Stripe deposit flow (PaymentIntent, in-app payment, webhook, mark paid). Square deposit flow (same pattern). Refund flow (cancellation within policy window). |
| 12 | No-show handling (deposit captured after appointment time passes). Payment history screen. Revenue dashboard. Stripe Connect onboarding for businesses. |

Deliverable: Full payment lifecycle — deposits, refunds, no-show capture.

### Phase 5 — Production Hardening (Weeks 13-14)

| Week | Deliverable |
|---|---|
| 13 | Rate limiting. Input validation on all endpoints. Error handling + logging (Winston). Health check endpoint. Docker healthcheck. SNS alerts for critical errors. |
| 14 | EAS build pipeline (signed IPA + APK). App Store + Play Store submission. Production .env on EC2. Secrets Manager wiring. Load testing (concurrent bookings). |

Deliverable: App in App Store + Play Store. Backend in production.

---

## Reuse Map (Auzora to Bzy)

| Auzora File | Bzy Use | How |
|---|---|---|
| openaiRealtime.js | AI phone agent | Copy + adapt: booking tool writes to DynamoDB instead of Google Calendar |
| audioUtils.js | mu-law to PCM16 conversion | Copy verbatim |
| twilioProvision.js | Number provisioning | Copy + change webhook URLs to Bzy's domain |
| businessHours.js | Hours parsing + validation | Copy verbatim |
| elevenlabs.js | TTS fallback | Copy verbatim (new API key) |
| voiceCatalog.js | Voice selection | Copy verbatim |
| speechNormalize.js | Text normalization | Copy verbatim |
| spellingCapture.js | Email/name spelling | Copy verbatim |
| stripeWebhookHandler.js | Subscription handling | Copy + adapt (new price IDs, new DynamoDB table) |
| squareAuth.js | Square OAuth | Copy + adapt (new Square app credentials) |
| numberQueue.js | Number pool | Copy + change table name |
| bookingOrchestrator.js | Not reused | Bzy's booking goes to DynamoDB, not Google Calendar |
| googleCalendar.js | Not reused | No external calendar |
| calendarProvider.js | Not reused | No provider abstraction needed |
| smsService.js | Not reused | No SMS |
| bookingFormRouter.js | Not reused | No SMS booking form |

---

## Pricing Tiers (suggested)

| Tier | Price | Includes |
|---|---|---|
| Free | $0/mo | Up to 50 bookings/mo, 1 service category, no deposits, no AI agent |
| Pro | $29/mo | Unlimited bookings, deposits, Stripe + Square, push notifications |
| Elite | $79/mo | Everything in Pro + AI phone agent (up to 500 min/mo) |

AI agent overage: $0.30/min above plan limit (matches OpenAI Realtime cost).

---

## Key Architecture Decisions

1. **No external calendar** — Bookings ARE the calendar. DynamoDB queries replace Google Calendar FreeBusy. Simpler, no OAuth, no timezone offset bugs.

2. **No SMS** — Push notifications via Expo Push replace all SMS use cases. The AI phone agent uses voice only (no SMS booking links like Auzora).

3. **Separate infrastructure** — Own EC2, own DynamoDB tables, own Twilio sub-account, own Stripe/Square accounts. Zero shared state with Auzora.

4. **JWT auth** — Standard JWT + refresh token flow (Auzora uses access codes). Mobile-appropriate, stateless, scalable.

5. **AI agent as paid tier** — Not every business needs a phone agent. Twilio numbers are only provisioned when a business upgrades to the Elite tier.

6. **Both payment providers** — Businesses choose Stripe or Square at setup. Some salons already use Square POS; others prefer Stripe. Supporting both maximizes addressable market.

7. **React Native + Expo** — One codebase for iOS + Android. Expo handles push notifications, OTA updates, and build pipeline. No native code to maintain.
