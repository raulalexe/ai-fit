# AI Workout Architect

A full-stack AI-powered workout planner that pairs an Expo/React Native front-end with Vercel Edge Functions, OpenAI/Anthropic models, and Vercel KV for persistence.

## Stack

- **Frontend:** React Native + Expo Router, TanStack Query, Expo Secure Store/Crypto for device identity
- **Backend:** Vercel Edge Functions (`/api/*`) written in TypeScript
- **AI:** OpenAI (default) or Anthropic with structured JSON prompts
- **Database:** Vercel KV (Redis) storing `users` and `workouts` tables-as-keys

## Project Structure

```
├── api/                  # Vercel Edge Functions
│   ├── generate-workout.ts
│   ├── save-workout.ts
│   └── workouts.ts
├── lib/                  # Shared backend utilities (prompt, schemas, env)
├── mobile/               # Expo app
│   ├── app/(tabs)/index.tsx      # Planner screen
│   ├── app/(tabs)/explore.tsx    # Saved workouts
│   └── ...                  # Components, hooks, constants
├── package.json          # Root workspace (manages backend deps + scripts)
└── README.md
```

## Prerequisites

- Node.js 20+
- Expo CLI (`npm install -g expo` optional if using `npx`)
- Vercel account with KV database enabled
- OpenAI or Anthropic API key

## Environment Variables

| Name | Description |
| --- | --- |
| `OPENAI_API_KEY` | Optional – used if present |
| `OPENAI_MODEL` | Defaults to `gpt-4o-mini` |
| `ANTHROPIC_API_KEY` | Optional – fallback if OpenAI missing |
| `ANTHROPIC_MODEL` | Defaults to `claude-3-5-sonnet-latest` |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `KV_URL` | Provided by Vercel KV |
| `EXPO_PUBLIC_API_BASE_URL` | Optional override for mobile to point at deployed API |
| `PREMIUM_MONTHLY_PRICE` | Display price (defaults to `5.99`) shown in the app |
| `PREMIUM_ANNUAL_PRICE` | Annual plan price shown in the app (defaults to `59.99`) |
| `FREE_DAILY_WORKOUT_LIMIT` | Override free-tier quota (defaults to `1`) |
| `STRIPE_SECRET_KEY` | Optional: legacy Stripe verification key (only needed if you keep `/api/upgrade`) |
| `REVENUECAT_API_KEY` | Secret RevenueCat REST API key used by `/api/verify-subscription` |
| `VERIFY_SUBSCRIPTION_API_KEY` | Shared secret that clients must send in the `x-api-key` header when calling `/api/verify-subscription` |
| `EXPO_PUBLIC_REVENUECAT_KEY` | RevenueCat public SDK key used by the Expo app (`react-native-purchases`) |
| `EXPO_PUBLIC_VERIFY_SUBSCRIPTION_KEY` | Public key forwarded to `/api/verify-subscription` (matches `VERIFY_SUBSCRIPTION_API_KEY`) |

Create a `.env` locally (and configure Vercel project env variables) with the keys above.

## Install & Run

```bash
# Install backend deps
npm install

# Install mobile deps
cd mobile
npm install

# Start Expo dev server
npm run start
```

Use the Expo Go app or an emulator to load the project. The mobile app hits `http://localhost:3000/api/*` by default; set `EXPO_PUBLIC_API_BASE_URL` when using a remote Vercel deployment.

## Edge API Endpoints

All endpoints run on the Vercel Edge runtime and live under `/api`.

| Method & Path | Description |
| --- | --- |
| `POST /api/generate-workout` | Validates user inputs, builds the master prompt, calls the AI provider, enforces JSON schema, and returns `{ request, plan }`. |
| `GET /api/workouts?userId=...` | Fetches the 50 most recent workouts for a user from Vercel KV. |
| `POST /api/save-workout` | Persists a workout record (`inputs` and `output`) with timestamps and ensures a user row exists. |
| `GET /api/user?userId=...` | Returns membership tier, remaining free workouts, pricing, and feature limits for the device/user id. |
| `POST /api/upgrade` | (Legacy) Verifies a Stripe Checkout receipt and upgrades the user to premium. Keep only if you still sell via Stripe. |
| `POST /api/verify-subscription` | Calls RevenueCat, caches the result for 10 minutes, and returns `{ premium, entitlementExpiration, remainingFreeWorkouts }`. Requires an `x-api-key` header. |

### Request/Response Shapes

- `POST /api/generate-workout`
  - **Body:** `{ time, intensity, goal, equipment, userId }`
  - **Response:** `{ request, plan }`
- `POST /api/save-workout`
  - **Body:** `{ userId, request, plan }`
  - **Response:** `{ id, user_id, created_at, inputs, output }`
- `GET /api/workouts`
  - **Response:** `{ data: Array<{ id, user_id, created_at, inputs, output }> }`
- `GET /api/user`
  - **Response:** `{ id, tier, pricing: { monthly, annual, supportedPlans }, remainingFreeWorkouts, limits, subscription }`
- `POST /api/upgrade`
  - **Body:** `{ userId, provider: 'stripe', plan: 'monthly' | 'annual', receipt: '<checkout-session-id>' }`
  - **Behavior:** Verifies the Stripe Checkout session, saves the receipt, upgrades the user to premium, and returns the updated profile payload.
- `POST /api/verify-subscription`
  - **Headers:** `x-api-key: <VERIFY_SUBSCRIPTION_API_KEY>`
  - **Body:** `{ userId }`
  - **Response:** `{ premium: boolean, entitlementExpiration: string | null, remainingFreeWorkouts: number | null }`

## Database Layout (Vercel KV)

Although Vercel KV is a Redis store, it mirrors table semantics via key naming:

- **Users table** (`users:{userId}` hash)
  - `id`
  - `created_at`
  - `updated_at`
  - `settings` (JSON string of the most recent workout inputs)
- **Workouts table** (`workouts:{userId}` list)
  - Each entry: `{ id, user_id, created_at, inputs, output }`
  - Lists are trimmed to the 50 most recent workouts per user
- **Subscriptions table** (`subscriptions:{userId}` hash)
  - `{ provider, plan, receiptId, amount, currency, purchasedAt, expiresAt }`
- **Usage counters** (`usage:{userId}:YYYY-MM-DD` keys)
  - Increment-only values that expire nightly; used to calculate remaining free workouts

## Mobile UX Highlights

- Planner tab lets users pick **time / intensity / goal / equipment** and generate an AI-crafted session that includes:
  - Workout summary & metrics
  - Detailed block breakdowns with exercises and instructions
  - Per-block countdown timers
  - Warm-up, finisher, and cooldown lists
- Saved tab syncs with the backend to show previously saved workouts with quick previews.
- Built-in monetization: a dedicated paywall modal (`app/paywall.tsx` → `src/screens/PaywallScreen.tsx`) highlights the monthly `$7.99` and annual `$59` plans, the required copy (“Unlock Premium Training”, “Train smarter with unlimited AI-powered workouts.”), and the full benefits list. It is backed by RevenueCat (`react-native-purchases`) on-device plus `/api/verify-subscription` on the server. A global Zustand store tracks `premium`, remaining free workouts, emits analytics events (`paywall_viewed`, `paywall_purchase_*`, `feature_locked_clicked`, etc.), and enforces locks on free-tier users (daily limit, advanced goals/equipment, history, voice coaching, custom plans, 3-day streak rewards, etc.).

## Paywall / Premium Architecture

```
mobile/
  src/
    api/verifySubscription.ts        # Calls the Edge verifier with the required x-api-key header
    components/
      PlanCard.tsx
      PremiumFeatureList.tsx
    hooks/usePremium.ts              # Router-aware helper around the Zustand store
    screens/PaywallScreen.tsx        # Full-screen modal, RevenueCat offerings, CTA, restore purchases
    stores/premiumStore.ts           # Global premium + remaining-free-workouts state
    utils/analytics.ts               # Centralized tracking helper
```

- `react-native-purchases` is configured once in `app/_layout.tsx` via `Purchases.configure({ apiKey: EXPO_PUBLIC_REVENUECAT_KEY, appUserID })`.
- `usePremium` exposes `premium`, `remainingFreeWorkouts`, `refreshPremiumStatus`, and helper methods (`openPaywall`, `requirePremium`, `decrementFreeWorkout`). All premium gating flows (daily quotas, locked goals/equipment, advanced settings, history saves, etc.) call these helpers.
- Analytics events (`paywall_viewed`, `paywall_plan_selected`, `paywall_purchase_clicked/succeeded/failed`, `feature_locked_clicked`) are logged through `src/utils/analytics`.
- `POST /api/verify-subscription` fetches the latest entitlements from RevenueCat, caches the response for 10 minutes, and returns both `premium` and `remainingFreeWorkouts`. Clients must supply the `x-api-key` header.

### RevenueCat setup recap

1. Add products `premium_monthly` and `premium_annual` to a single offering in RevenueCat, granting the `premium` entitlement.
2. Set server env vars `REVENUECAT_API_KEY` and `VERIFY_SUBSCRIPTION_API_KEY`.
3. Expose the matching public keys `EXPO_PUBLIC_REVENUECAT_KEY` and `EXPO_PUBLIC_VERIFY_SUBSCRIPTION_KEY` to the Expo app.
4. The paywall screen automatically fetches offerings (`Purchases.getOfferings()`), lets users choose a plan, and runs `Purchases.purchasePackage`. Restoring purchases calls `Purchases.restorePurchases`.

## Deployment

1. Connect the repo to Vercel.
2. Enable Vercel KV and copy the REST URL/TOKEN/URL vars.
3. Set the AI provider env vars.
4. Deploy – Vercel will build the Edge functions automatically.
5. For Expo production builds, set `EXPO_PUBLIC_API_BASE_URL` to your Vercel deployment (`https://<project>.vercel.app`).

## Testing & Linting

- `npm run test:backend` (Vitest unit tests for the tier helper logic)
- `npm run lint` (delegates to Expo’s lint config)
- Additional mobile testing can be done with Expo’s preview builds or E2E frameworks (Detox, Maestro) as needed.