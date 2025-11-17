import { kv } from '@vercel/kv';

import { env } from './env';
import { equipmentOptions, goalOptions, type GenerateWorkoutPayload } from './workout-schema';

export type UserTier = 'free' | 'premium';

export const FREE_ALLOWED_GOALS: typeof goalOptions = ['strength', 'endurance'];
export const FREE_ALLOWED_EQUIPMENT: typeof equipmentOptions = ['bodyweight', 'minimal'];
export const FREE_DAILY_WORKOUT_LIMIT = Number(process.env.FREE_DAILY_WORKOUT_LIMIT ?? '1');

const USER_KEY_PREFIX = 'users';
const USAGE_KEY_PREFIX = 'usage';

export interface UserProfile {
  id: string;
  tier: UserTier;
  createdAt: string;
  settings?: Omit<GenerateWorkoutPayload, 'userId'>;
}

export class TierLimitError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number = 403
  ) {
    super(message);
  }
}

export async function getUserProfile(userId: string): Promise<UserProfile> {
  const key = await ensureUserKey(userId);
  const [tier, createdAt, settingsRaw] = await Promise.all([
    kv.hget<string>(key, 'tier'),
    kv.hget<string>(key, 'created_at'),
    kv.hget<string>(key, 'settings'),
  ]);

  return {
    id: userId,
    tier: tier === 'premium' ? 'premium' : 'free',
    createdAt: createdAt ?? new Date().toISOString(),
    settings: parseSettings(settingsRaw),
  };
}

export async function upgradeUserProfile(userId: string): Promise<UserProfile> {
  const key = await ensureUserKey(userId);
  await kv.hset(key, {
    tier: 'premium',
    updated_at: new Date().toISOString(),
  });
  return getUserProfile(userId);
}

export async function assertFreeTierAccess(
  profile: UserProfile,
  payload: GenerateWorkoutPayload
) {
  if (profile.tier === 'premium') {
    return;
  }

  if (!FREE_ALLOWED_GOALS.includes(payload.goal)) {
    throw new TierLimitError('That goal is premium-only. Upgrade to unlock advanced goals.', 'goal_restricted');
  }

  if (!FREE_ALLOWED_EQUIPMENT.includes(payload.equipment)) {
    throw new TierLimitError('That equipment option requires premium access.', 'equipment_restricted');
  }
}

export async function assertDailyWorkoutQuota(profile: UserProfile) {
  if (profile.tier === 'premium') {
    return;
  }

  const usage = await getUsageCount(profile.id);
  if (usage >= FREE_DAILY_WORKOUT_LIMIT) {
    throw new TierLimitError('Free tier allows 1 workout per day. Upgrade for unlimited sessions.', 'daily_limit');
  }
}

export async function recordDailyUsage(profile: UserProfile) {
  if (profile.tier === 'premium') {
    return;
  }

  const key = getUsageKey(profile.id);
  const nextValue = await kv.incr(key);
  if (nextValue === 1) {
    await kv.expire(key, secondsUntilTomorrow());
  }
}

export async function updateUserSettings(payload: GenerateWorkoutPayload) {
  const key = await ensureUserKey(payload.userId);
  const { userId: _userId, ...settings } = payload;
  await kv.hset(key, {
    settings: JSON.stringify(settings),
    updated_at: new Date().toISOString(),
  });
}

export function serializeProfileResponse(profile: UserProfile) {
  return {
    id: profile.id,
    tier: profile.tier,
    premiumPrice: env.PREMIUM_MONTHLY_PRICE,
    limits: {
      dailyFreeWorkouts: FREE_DAILY_WORKOUT_LIMIT,
      allowedGoals: profile.tier === 'premium' ? goalOptions : FREE_ALLOWED_GOALS,
      allowedEquipment: profile.tier === 'premium' ? equipmentOptions : FREE_ALLOWED_EQUIPMENT,
    },
  };
}

async function ensureUserKey(userId: string) {
  const key = getUserKey(userId);
  const exists = await kv.hget<string>(key, 'id');

  if (!exists) {
    const now = new Date().toISOString();
    await kv.hset(key, {
      id: userId,
      tier: 'free',
      created_at: now,
      updated_at: now,
    });
  }

  return key;
}

function parseSettings(raw?: string | null) {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as Omit<GenerateWorkoutPayload, 'userId'>;
  } catch {
    return undefined;
  }
}

function getUserKey(userId: string) {
  return `${USER_KEY_PREFIX}:${userId}`;
}

function getUsageKey(userId: string) {
  const today = new Date().toISOString().split('T')[0];
  return `${USAGE_KEY_PREFIX}:${userId}:${today}`;
}

async function getUsageCount(userId: string) {
  const key = getUsageKey(userId);
  const count = await kv.get<number>(key);
  return count ?? 0;
}

function secondsUntilTomorrow() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCHours(24, 0, 0, 0);
  return Math.ceil((tomorrow.getTime() - now.getTime()) / 1000);
}
