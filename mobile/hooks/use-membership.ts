import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchUserProfile, upgradeUser } from '@/lib/api';
import type { UpgradePayload } from '@/lib/api';
import type { UserProfile } from '@/types/user';

export function useMembership(userId?: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery<UserProfile>({
    queryKey: ['user-profile', userId],
    queryFn: () => {
      if (!userId) {
        throw new Error('Missing user id');
      }
      return fetchUserProfile(userId);
    },
    enabled: Boolean(userId),
  });

  const upgradeMutation = useMutation({
    mutationKey: ['upgrade', userId],
    mutationFn: (payload: UpgradePayload) => upgradeUser(payload),
    onSuccess: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ['user-profile', userId] });
        queryClient.invalidateQueries({ queryKey: ['workouts', userId] });
      }
    },
  });

  return {
    profile: query.data,
    loading: query.isLoading,
    error: query.error,
    upgrade: upgradeMutation,
  };
}
