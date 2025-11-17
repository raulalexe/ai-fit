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
| `GET /api/user?userId=...` | Returns membership tier, pricing, and feature limits for the device/user id. |
| `POST /api/upgrade` | Upgrades a user to premium (stubbed for now; integrate payments later). |

### Request/Response Shapes

- `POST /api/generate-workout`
  - **Body:** `{ time, intensity, goal, equipment, userId }`
  - **Response:** `{ request, plan }`
- `POST /api/save-workout`
  - **Body:** `{ userId, request, plan }`
  - **Response:** `{ id, user_id, created_at, inputs, output }`
- `GET /api/workouts`
  - **Response:** `{ data: Array<{ id, user_id, created_at, inputs, output }> }`

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

## Mobile UX Highlights

- Planner tab lets users pick **time / intensity / goal / equipment** and generate an AI-crafted session that includes:
  - Workout summary & metrics
  - Detailed block breakdowns with exercises and instructions
  - Per-block countdown timers
  - Warm-up, finisher, and cooldown lists
- Saved tab syncs with the backend to show previously saved workouts with quick previews.
- Built-in monetization: the app fetches membership status from `/api/user` and enforces free-tier limits (1 workout/day, restricted goals/equipment, no history). Upgrading via `/api/upgrade` flips the tier to premium, unlocking unlimited generations, multiple daily sessions, advanced goals/equipment, and workout history.

## Deployment

1. Connect the repo to Vercel.
2. Enable Vercel KV and copy the REST URL/TOKEN/URL vars.
3. Set the AI provider env vars.
4. Deploy – Vercel will build the Edge functions automatically.
5. For Expo production builds, set `EXPO_PUBLIC_API_BASE_URL` to your Vercel deployment (`https://<project>.vercel.app`).

## Testing & Linting

- `npm run lint` (delegates to Expo’s lint config)
- Additional mobile testing can be done with Expo’s preview builds or E2E frameworks (Detox, Maestro) as needed.