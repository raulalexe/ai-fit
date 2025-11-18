import { create } from 'zustand';

import { verifySubscriptionRequest } from '@/src/api/verifySubscription';

type PremiumState = {
  premium: boolean;
  loading: boolean;
  remainingFreeWorkouts: number;
  entitlementExpiration: string | null;
  lastError?: string | null;
  refreshPremiumStatus: (userId: string) => Promise<void>;
  setPremium: (value: boolean) => void;
  decrementFreeWorkout: () => void;
};

export const usePremiumStore = create<PremiumState>((set) => ({
  premium: false,
  loading: false,
  remainingFreeWorkouts: 1,
  entitlementExpiration: null,
  lastError: null,
  setPremium: (value: boolean) => set({ premium: value }),
  decrementFreeWorkout: () =>
    set((state) => {
      if (state.premium) {
        return state;
      }
      return {
        ...state,
        remainingFreeWorkouts: Math.max(state.remainingFreeWorkouts - 1, 0),
      };
    }),
  refreshPremiumStatus: async (userId: string) => {
    if (!userId) return;
    set({ loading: true, lastError: null });
    try {
      const result = await verifySubscriptionRequest(userId);
      set({
        premium: result.premium,
        remainingFreeWorkouts:
          result.premium || typeof result.remainingFreeWorkouts !== 'number'
            ? null
            : result.remainingFreeWorkouts,
        entitlementExpiration: result.entitlementExpiration ?? null,
        loading: false,
        lastError: null,
      });
    } catch (error) {
      set({
        loading: false,
        lastError: error instanceof Error ? error.message : 'Unable to refresh premium status',
      });
    }
  },
}));
