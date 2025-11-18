import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import { usePremiumStore } from '@/src/stores/premiumStore';
import { trackEvent } from '@/src/utils/analytics';

export function usePremium() {
  const router = useRouter();
  const premium = usePremiumStore((state) => state.premium);
  const loading = usePremiumStore((state) => state.loading);
  const remainingFreeWorkouts = usePremiumStore((state) => state.remainingFreeWorkouts);
  const refreshPremiumStatus = usePremiumStore((state) => state.refreshPremiumStatus);
  const decrementFreeWorkout = usePremiumStore((state) => state.decrementFreeWorkout);

  const openPaywall = useCallback(
    (reason?: string, userId?: string) => {
      if (premium) return;
      trackEvent('paywall_viewed', { reason, userId });
      router.push('/paywall');
    },
    [premium, router]
  );

  const requirePremium = useCallback(
    (feature: string, userId?: string) => {
      if (premium) {
        return true;
      }
      trackEvent('feature_locked_clicked', { feature, userId });
      router.push('/paywall');
      return false;
    },
    [premium, router]
  );

  return {
    premium,
    loading,
    remainingFreeWorkouts,
    refreshPremiumStatus,
    decrementFreeWorkout,
    openPaywall,
    requirePremium,
  };
}
