import type { EquipmentOption, GoalOption } from './workout';

export type UserTier = 'free' | 'premium';

export interface UserProfile {
  id: string;
  tier: UserTier;
  premiumPrice: string;
  limits: {
    dailyFreeWorkouts: number;
    allowedGoals: GoalOption[];
    allowedEquipment: EquipmentOption[];
  };
}
