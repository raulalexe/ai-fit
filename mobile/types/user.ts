import type { EquipmentOption, GoalOption } from './workout';

export type UserTier = 'free' | 'premium';
export type PlanInterval = 'monthly' | 'annual';

export interface MembershipPricing {
  monthly: string;
  annual: string;
  supportedPlans: PlanInterval[];
}

export interface SubscriptionMeta {
  provider: string;
  plan: PlanInterval;
  receiptId: string;
  amount: number;
  currency: string;
  purchasedAt: string;
  expiresAt: string;
}

export interface UserProfile {
  id: string;
  tier: UserTier;
  pricing: MembershipPricing;
  remainingFreeWorkouts: number | null;
  limits: {
    dailyFreeWorkouts: number;
    allowedGoals: GoalOption[];
    allowedEquipment: EquipmentOption[];
  };
  subscription?: SubscriptionMeta | null;
}
