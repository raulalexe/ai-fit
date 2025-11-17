import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { equipmentOptions, goalOptions, intensityOptions, timeOptions } from '@/constants/workout';
import { useUserId } from '@/hooks/use-user-id';
import { useGenerateWorkout, useSaveWorkout } from '@/hooks/use-workout-api';
import type { WorkoutBlock, WorkoutResponse, WorkoutSelection } from '@/types/workout';

const defaultSelection: WorkoutSelection = {
  time: 45,
  intensity: 'medium',
  goal: 'strength',
  equipment: 'minimal',
};

export default function HomeScreen() {
  const { userId, loading: loadingUser } = useUserId();
  const generateWorkoutMutation = useGenerateWorkout(userId);
  const saveWorkoutMutation = useSaveWorkout(userId);
  const [selection, setSelection] = useState<WorkoutSelection>(defaultSelection);
  const [workout, setWorkout] = useState<WorkoutResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const disableActions = loadingUser || generateWorkoutMutation.isPending;

  const handleGenerate = async () => {
    setError(null);
    setStatusMessage(null);
    try {
      const plan = await generateWorkoutMutation.mutateAsync(selection);
      setWorkout(plan);
      setStatusMessage('Plan ready – scroll down to review.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate workout');
    }
  };

  const handleSave = async () => {
    if (!workout) return;
    try {
      await saveWorkoutMutation.mutateAsync(workout);
      setStatusMessage('Workout saved to your library.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save workout');
    }
  };

  const actionLabel = useMemo(() => {
    if (loadingUser) return 'Preparing profile...';
    if (generateWorkoutMutation.isPending) return 'Generating...';
    return 'Generate Workout';
  }, [loadingUser, generateWorkoutMutation.isPending]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedView style={styles.card}>
        <ThemedText type="title">Dial in your session</ThemedText>
        <ThemedText color="secondary">
          Select the time, intensity, goal, and gear you have. The AI coach will build a clean,
          block-based plan with timers.
        </ThemedText>

        <OptionGroup
          title="Time available"
          options={timeOptions.map((value) => ({
            value,
            label: `${value} min`,
            description: value <= 30 ? 'Sprint session' : value >= 60 ? 'Deep work' : 'Balanced',
          }))}
          value={selection.time}
          onChange={(time) => setSelection((prev) => ({ ...prev, time }))}
        />

        <OptionGroup
          title="Intensity"
          options={intensityOptions}
          value={selection.intensity}
          onChange={(intensity) => setSelection((prev) => ({ ...prev, intensity }))}
        />

        <OptionGroup
          title="Goal"
          options={goalOptions}
          value={selection.goal}
          onChange={(goal) => setSelection((prev) => ({ ...prev, goal }))}
        />

        <OptionGroup
          title="Equipment"
          options={equipmentOptions}
          value={selection.equipment}
          onChange={(equipment) => setSelection((prev) => ({ ...prev, equipment }))}
        />

        <Pressable
          accessibilityRole="button"
          style={[styles.primaryButton, disableActions && styles.buttonDisabled]}
          onPress={handleGenerate}
          disabled={disableActions}>
          {generateWorkoutMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>{actionLabel}</Text>
          )}
        </Pressable>

        {error && <ThemedText style={styles.error}>{error}</ThemedText>}
        {statusMessage && !error && <ThemedText style={styles.status}>{statusMessage}</ThemedText>}

        {workout && (
          <Pressable
            accessibilityRole="button"
            style={[
              styles.secondaryButton,
              (saveWorkoutMutation.isPending || !userId) && styles.buttonDisabled,
            ]}
            onPress={handleSave}
            disabled={saveWorkoutMutation.isPending || !userId}>
            {saveWorkoutMutation.isPending ? (
              <ActivityIndicator color="#111" />
            ) : (
              <Text style={styles.secondaryButtonText}>Save workout</Text>
            )}
          </Pressable>
        )}
      </ThemedView>

      {workout && <WorkoutPlanView workout={workout} />}
    </ScrollView>
  );
}

type Option<T> = {
  label: string;
  value: T;
  description?: string;
};

type OptionGroupProps<T> = {
  title: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

function OptionGroup<T extends string | number>({ title, options, value, onChange }: OptionGroupProps<T>) {
  return (
    <View style={styles.optionGroup}>
      <ThemedText type="subtitle">{title}</ThemedText>
      <View style={styles.optionGrid}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              style={[styles.optionCard, selected && styles.optionCardSelected]}>
              <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                {option.label}
              </Text>
              {option.description && (
                <Text style={[styles.optionDescription, selected && styles.optionDescriptionSelected]}>
                  {option.description}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function WorkoutPlanView({ workout }: { workout: WorkoutResponse }) {
  const { plan } = workout;

  return (
    <ThemedView style={styles.card}>
      <ThemedText type="title">Workout summary</ThemedText>
      <ThemedText>{plan.summary}</ThemedText>
      <ThemedText style={styles.meta}>
        Total duration · {plan.totalDurationMinutes} min · Intensity {plan.metrics.intensity.toUpperCase()}
      </ThemedText>

      <ListSection title="Warm-up" items={plan.warmup} />

      {plan.blocks.map((block) => (
        <WorkoutBlockCard key={block.id} block={block} />
      ))}

      <ListSection title="Finisher" items={plan.finisher} />
      <ListSection title="Cooldown" items={plan.cooldown} />
    </ThemedView>
  );
}

function ListSection({ title, items }: { title: string; items?: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <View style={styles.listSection}>
      <ThemedText type="subtitle">{title}</ThemedText>
      {items.map((item) => (
        <Text key={item} style={styles.listItem}>
          • {item}
        </Text>
      ))}
    </View>
  );
}

function WorkoutBlockCard({ block }: { block: WorkoutBlock }) {
  return (
    <View style={styles.blockCard}>
      <View style={styles.blockHeader}>
        <ThemedText type="subtitle">{block.title}</ThemedText>
        <Text style={styles.blockDuration}>{block.durationMinutes} min</Text>
      </View>
      <Text style={styles.blockFocus}>{block.focus}</Text>
      <Text style={styles.blockInstructions}>{block.instructions}</Text>

      <View style={styles.blockExercises}>
        {block.exercises.map((exercise) => (
          <View key={exercise.id} style={styles.exerciseItem}>
            <Text style={styles.exerciseName}>{exercise.name}</Text>
            <Text style={styles.exercisePrescription}>{exercise.prescription}</Text>
            {exercise.notes?.length ? (
              <Text style={styles.exerciseNotes}>Tips: {exercise.notes.join(' · ')}</Text>
            ) : null}
          </View>
        ))}
      </View>

      {block.tips?.length ? (
        <View style={styles.tips}>
          {block.tips.map((tip) => (
            <Text key={tip} style={styles.tipItem}>
              • {tip}
            </Text>
          ))}
        </View>
      ) : null}

      <BlockTimer seconds={block.timerSeconds} />
    </View>
  );
}

function BlockTimer({ seconds }: { seconds: number }) {
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setRemaining(seconds);
    setRunning(false);
  }, [seconds]);

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setRemaining((current) => {
        if (current <= 1) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [running]);

  const minutes = Math.floor(remaining / 60)
    .toString()
    .padStart(2, '0');
  const secs = Math.floor(remaining % 60)
    .toString()
    .padStart(2, '0');

  return (
    <View style={styles.timer}>
      <Text style={styles.timerLabel}>Block timer</Text>
      <Text style={styles.timerValue}>
        {minutes}:{secs}
      </Text>
      <View style={styles.timerActions}>
        <Pressable
          style={[styles.timerButton, running && styles.timerButtonSecondary]}
          onPress={() => setRunning((prev) => !prev)}>
          <Text style={styles.timerButtonText}>{running ? 'Pause' : 'Start'}</Text>
        </Pressable>
        <Pressable
          style={[styles.timerButton, styles.timerButtonSecondary]}
          onPress={() => {
            setRunning(false);
            setRemaining(seconds);
          }}>
          <Text style={styles.timerButtonText}>Reset</Text>
        </Pressable>
      </View>
    </View>
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
    gap: 16,
  },
  optionGroup: {
    gap: 8,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionCard: {
    flexGrow: 1,
    minWidth: '45%',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  optionCardSelected: {
    borderColor: '#0a7ea4',
    backgroundColor: '#e6f4ff',
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  optionLabelSelected: {
    color: '#0a7ea4',
  },
  optionDescription: {
    marginTop: 4,
    color: '#555',
  },
  optionDescriptionSelected: {
    color: '#0a7ea4',
  },
  primaryButton: {
    backgroundColor: '#0a7ea4',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  secondaryButton: {
    borderColor: '#0a7ea4',
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#0a7ea4',
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  error: {
    color: '#b3261e',
  },
  status: {
    color: '#0f9d58',
    fontWeight: '600',
  },
  meta: {
    color: '#666',
  },
  listSection: {
    gap: 4,
  },
  listItem: {
    color: '#333',
  },
  blockCard: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  blockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  blockDuration: {
    fontWeight: '600',
    color: '#0a7ea4',
  },
  blockFocus: {
    fontWeight: '600',
  },
  blockInstructions: {
    color: '#444',
  },
  blockExercises: {
    gap: 8,
    marginTop: 8,
  },
  exerciseItem: {
    borderLeftWidth: 2,
    borderLeftColor: '#0a7ea4',
    paddingLeft: 12,
    gap: 2,
  },
  exerciseName: {
    fontWeight: '600',
  },
  exercisePrescription: {
    color: '#444',
  },
  exerciseNotes: {
    color: '#777',
    fontStyle: 'italic',
  },
  tips: {
    backgroundColor: '#f6fbff',
    borderRadius: 12,
    padding: 8,
    gap: 4,
  },
  tipItem: {
    color: '#0a7ea4',
  },
  timer: {
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#111',
    gap: 8,
  },
  timerLabel: {
    color: '#fff',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  timerValue: {
    color: '#fff',
    fontSize: 24,
    fontVariant: ['tabular-nums'],
  },
  timerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  timerButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#0a7ea4',
    alignItems: 'center',
  },
  timerButtonSecondary: {
    backgroundColor: '#1c1c1e',
    borderWidth: 1,
    borderColor: '#3a3a3c',
  },
  timerButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
