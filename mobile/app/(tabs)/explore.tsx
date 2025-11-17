import { useCallback } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useUserId } from '@/hooks/use-user-id';
import { useSavedWorkouts } from '@/hooks/use-workout-api';
import type { StoredWorkout } from '@/types/workout';

export default function SavedWorkoutsScreen() {
  const { userId, loading } = useUserId();
  const { data, isFetching, refetch, error } = useSavedWorkouts(userId);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  if (loading) {
    return (
      <ThemedView style={styles.state}>
        <ActivityIndicator />
        <ThemedText>Loading your library...</ThemedText>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.state}>
        <ThemedText type="subtitle">We could not load your workouts.</ThemedText>
        <ThemedText>{error instanceof Error ? error.message : 'Unknown error'}</ThemedText>
      </ThemedView>
    );
  }

  if (!data?.length) {
    return (
      <ThemedView style={styles.state}>
        <ThemedText type="title">No saved workouts yet</ThemedText>
        <ThemedText color="secondary">Generate a plan from the Planner tab to save it here.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={handleRefresh} />}>
      {data.map((workout) => (
        <WorkoutListCard key={workout.id} workout={workout} />
      ))}
    </ScrollView>
  );
}

function WorkoutListCard({ workout }: { workout: StoredWorkout }) {
  const { plan, savedAt, request } = workout;
  const firstBlock = plan.blocks[0];
  const formattedDate = new Date(savedAt).toLocaleString();

  return (
    <ThemedView style={styles.card}>
      <View style={styles.cardHeader}>
        <ThemedText type="subtitle">{request.goal.toUpperCase()} · {plan.totalDurationMinutes} min</ThemedText>
        <Text style={styles.timestamp}>{formattedDate}</Text>
      </View>
      <Text style={styles.summary}>{plan.summary}</Text>
        {firstBlock ? (
          <View style={styles.blockPreview}>
            <Text style={styles.blockTitle}>{firstBlock.title}</Text>
            <Text style={styles.blockFocus}>{firstBlock.focus}</Text>
            {firstBlock.exercises.slice(0, 2).map((exercise) => (
              <Text key={exercise.id} style={styles.exerciseLine}>
                • {exercise.name} — {exercise.prescription}
              </Text>
            ))}
            {firstBlock.exercises.length > 2 && (
              <Text style={styles.moreExercises}>+{firstBlock.exercises.length - 2} more exercises</Text>
            )}
          </View>
        ) : null}
        <View style={styles.cardMeta}>
          <Text style={styles.metaText}>Intensity {plan.metrics.intensity.toUpperCase()}</Text>
          <Text style={styles.metaText}>Equipment · {request.equipment.replace(/_/g, ' ')}</Text>
        </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  cardHeader: {
    gap: 4,
  },
  timestamp: {
    color: '#666',
    fontSize: 12,
  },
  summary: {
    color: '#333',
  },
  blockPreview: {
    backgroundColor: '#f6fbff',
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  blockTitle: {
    fontWeight: '600',
  },
  blockFocus: {
    color: '#0a7ea4',
    fontWeight: '500',
  },
  exerciseLine: {
    color: '#333',
  },
  moreExercises: {
    color: '#999',
    fontStyle: 'italic',
  },
  cardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaText: {
    fontSize: 12,
    color: '#555',
  },
  state: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 24,
  },
});
