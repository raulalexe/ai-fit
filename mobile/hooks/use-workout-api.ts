import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchWorkouts, generateWorkout, saveWorkout } from '@/lib/api';
import type { StoredWorkout, WorkoutResponse, WorkoutSelection } from '@/types/workout';

export function useGenerateWorkout(userId?: string | null) {
  return useMutation({
    mutationKey: ['generate-workout', userId],
    mutationFn: (selection: WorkoutSelection) => generateWorkout({ ...selection, userId }),
  });
}

export function useSaveWorkout(userId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['save-workout', userId],
    mutationFn: async (workout: WorkoutResponse) => {
      if (!userId) {
        throw new Error('Missing user id');
      }
      return saveWorkout(userId, workout);
    },
    onSuccess: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ['workouts', userId] });
      }
    },
  });
}

export function useSavedWorkouts(userId?: string | null) {
  return useQuery<StoredWorkout[]>({
    queryKey: ['workouts', userId],
    queryFn: () => {
      if (!userId) {
        throw new Error('Missing user id');
      }
      return fetchWorkouts(userId);
    },
    enabled: Boolean(userId),
    initialData: [],
  });
}
