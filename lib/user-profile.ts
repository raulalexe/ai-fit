import { kv } from '@vercel/kv';

import { env } from './env';
import { planIntervals, type PlanInterval } from './plans';
import { FREE_ALLOWED_EQUIPMENT, FREE_ALLOWED_GOALS } from './tier-constants';
import type { BillingProvider } from './billing';
import {
  equipmentOptions,
  goalOptions,
  type EquipmentOption,
  type GenerateWorkoutPayload,
  type GoalOption,
} from './workout-schema';

export type UserTier = 'free' | 'premium';

export const FREE_DAILY_WORKOUT_LIMIT = Number(process.env.FREE_DAILY_WORKOUT_LIMIT ?? '1');

const USER_KEY_PREFIX = 'users';
const USAGE_KEY_PREFIX = 'usage';
const SUBSCRIPTION_KEY_PREFIX = 'subscriptions';

export interface UserProfile {
  id: string;
  tier: UserTier;
  createdAt: string;
  settings?: Omit<GenerateWorkoutPayload, 'userId'>;
}

export interface SubscriptionRecord {
  provider: BillingProvider;
  plan: PlanInterval;
  receiptId: string;
  amount: number;
  currency: string;
  purchasedAt: string;
  expiresAt: string;
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

export function isGoalAllowed(tier: UserTier, goal: GoalOption) {
  return tier === 'premium' || FREE_ALLOWED_GOALS.includes(goal);
}

export function isEquipmentAllowed(tier: UserTier, equipment: EquipmentOption) {
  return tier === 'premium' || FREE_ALLOWED_EQUIPMENT.includes(equipment);
}

export function shouldBlockDailyUsage(tier: UserTier, usageCount: number) {
  return tier !== 'premium' && usageCount >= FREE_DAILY_WORKOUT_LIMIT;
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

export async function upgradeUserProfile(userId: string, record?: SubscriptionRecord): Promise<UserProfile> {
  const key = await ensureUserKey(userId);
  const payload: Record<string, string> = {
    tier: 'premium',
    updated_at: new Date().toISOString(),
  };

  if (record) {
    payload.plan_interval = record.plan;
    payload.plan_expires_at = record.expiresAt;
    payload.last_receipt_id = record.receiptId;
  }

  await kv.hset(key, payload);
  return getUserProfile(userId);
}

export async function assertFreeTierAccess(
  profile: UserProfile,
  payload: GenerateWorkoutPayload
) {
  if (!isGoalAllowed(profile.tier, payload.goal)) {
    throw new TierLimitError('That goal is premium-only. Upgrade to unlock advanced goals.', 'goal_restricted');
  }

  if (!isEquipmentAllowed(profile.tier, payload.equipment)) {
    throw new TierLimitError('That equipment option requires premium access.', 'equipment_restricted');
  }
}

export async function assertDailyWorkoutQuota(profile: UserProfile) {
  const usage = await getUsageCount(profile.id);
  if (shouldBlockDailyUsage(profile.tier, usage)) {
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

export async function serializeProfileResponse(profile: UserProfile) {
  const usage = await getUsageCount(profile.id);
  const subscription = await getSubscriptionRecord(profile.id);

  return {
    id: profile.id,
    tier: profile.tier,
    pricing: {
      monthly: env.PREMIUM_MONTHLY_PRICE,
      annual: env.PREMIUM_ANNUAL_PRICE,
      supportedPlans: planIntervals,
    },
    remainingFreeWorkouts: profile.tier === 'premium' ? null : Math.max(FREE_DAILY_WORKOUT_LIMIT - usage, 0),
    limits: {
      dailyFreeWorkouts: FREE_DAILY_WORKOUT_LIMIT,
      allowedGoals: profile.tier === 'premium' ? goalOptions : FREE_ALLOWED_GOALS,
      allowedEquipment: profile.tier === 'premium' ? equipmentOptions : FREE_ALLOWED_EQUIPMENT,
    },
    subscription,
  };
}

export async function saveSubscriptionRecord(userId: string, record: SubscriptionRecord) {
  const key = getSubscriptionKey(userId);
  await kv.hset(key, {
    ...record,
    amount: record.amount.toString(),
  });
}

export async function getSubscriptionRecord(userId: string): Promise<SubscriptionRecord | null> {
  const key = getSubscriptionKey(userId);
  const payload = await kv.hgetall<Record<string, string>>(key);
  if (!payload || Object.keys(payload).length === 0) {
    return null;
  }
  return {
    provider: payload.provider as BillingProvider,
    plan: payload.plan as PlanInterval,
    receiptId: payload.receiptId ?? '',
    amount: payload.amount ? Number(payload.amount) : 0,
    currency: payload.currency ?? 'usd',
    purchasedAt: payload.purchasedAt ?? '',
    expiresAt: payload.expiresAt ?? '',
  };
}

export async function getUsageCount(userId: string) {
  const key = getUsageKey(userId);
  const count = await kv.get<number>(key);
  return count ?? 0;
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

function getSubscriptionKey(userId: string) {
  return `${SUBSCRIPTION_KEY_PREFIX}:${userId}`;
}

function secondsUntilTomorrow() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCHours(24, 0, 0, 0);
  return Math.ceil((tomorrow.getTime() - now.getTime()) / 1000);
}
