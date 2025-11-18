import { describe, expect, it } from 'vitest';

import {
  TierLimitError,
  assertFreeTierAccess,
  isEquipmentAllowed,
  isGoalAllowed,
  shouldBlockDailyUsage,
} from '../lib/user-profile';

const freeProfile = {
  id: 'test-user',
  tier: 'free' as const,
  createdAt: new Date().toISOString(),
};

const premiumProfile = {
  ...freeProfile,
  tier: 'premium' as const,
};

describe('tier helpers', () => {
  it('allows premium users to pick any goal', () => {
    expect(isGoalAllowed('premium', 'fat_loss')).toBe(true);
  });

  it('blocks advanced goals for free users', () => {
    expect(isGoalAllowed('free', 'hypertrophy')).toBe(false);
  });

  it('allows free users to select minimal equipment', () => {
    expect(isEquipmentAllowed('free', 'minimal')).toBe(true);
  });

  it('blocks full gym equipment for free users', () => {
    expect(isEquipmentAllowed('free', 'full_gym')).toBe(false);
  });

  it('detects when the free tier daily quota is exhausted', () => {
    expect(shouldBlockDailyUsage('free', 1)).toBe(true);
    expect(shouldBlockDailyUsage('free', 0)).toBe(false);
    expect(shouldBlockDailyUsage('premium', 10)).toBe(false);
  });

  it('throws a TierLimitError when a free user selects a premium-only goal', async () => {
    await expect(
      assertFreeTierAccess(freeProfile, {
        userId: 'test-user',
        time: 30,
        intensity: 'medium',
        goal: 'fat_loss',
        equipment: 'minimal',
      })
    ).rejects.toBeInstanceOf(TierLimitError);
  });

  it('allows premium users to bypass access checks', async () => {
    await expect(
      assertFreeTierAccess(premiumProfile, {
        userId: 'test-user',
        time: 45,
        intensity: 'high',
        goal: 'fat_loss',
        equipment: 'full_gym',
      })
    ).resolves.toBeUndefined();
  });
});
