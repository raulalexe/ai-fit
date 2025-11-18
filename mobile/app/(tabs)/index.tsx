import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { equipmentOptions, goalOptions, intensityOptions, timeOptions } from '@/constants/workout';
import { useUserId } from '@/hooks/use-user-id';
import { useGenerateWorkout, useSaveWorkout } from '@/hooks/use-workout-api';
import type { WorkoutBlock, WorkoutResponse, WorkoutSelection } from '@/types/workout';
import { usePremium } from '@/src/hooks/usePremium';

const defaultSelection: WorkoutSelection = {
  time: 45,
  intensity: 'medium',
  goal: 'strength',
  equipment: 'minimal',
};

const freeGoalValues: WorkoutSelection['goal'][] = ['strength', 'endurance'];
const freeEquipmentValues: WorkoutSelection['equipment'][] = ['bodyweight', 'minimal'];
const allGoalValues = goalOptions.map((option) => option.value);
const allEquipmentValues = equipmentOptions.map((option) => option.value);
const MONTHLY_PRICE_LABEL = '$7.99/mo';
const ANNUAL_PRICE_LABEL = '$59/yr';

export default function HomeScreen() {
  const { userId, loading: loadingUser } = useUserId();
  const {
    premium,
    loading: premiumLoading,
    remainingFreeWorkouts,
    openPaywall,
    requirePremium,
    decrementFreeWorkout,
  } = usePremium();
  const generateWorkoutMutation = useGenerateWorkout(userId);
  const saveWorkoutMutation = useSaveWorkout(userId);
  const [selection, setSelection] = useState<WorkoutSelection>(defaultSelection);
  const [workout, setWorkout] = useState<WorkoutResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const streakCountRef = useRef(0);
  const streakPaywallShown = useRef(false);

  const allowedGoals = premium ? allGoalValues : freeGoalValues;
  const allowedEquipment = premium ? allEquipmentValues : freeEquipmentValues;
  const canSaveHistory = premium;
  const disableActions =
    loadingUser || premiumLoading || !userId || generateWorkoutMutation.isPending;

  const handleGenerate = async () => {
    setError(null);
    setStatusMessage(null);
    try {
      if (!premium && remainingFreeWorkouts <= 0) {
        openPaywall('daily_limit', userId ?? undefined);
        return;
      }
      const plan = await generateWorkoutMutation.mutateAsync(selection);
      setWorkout(plan);
      setStatusMessage('Plan ready – scroll down to review.');
      if (!premium) {
        decrementFreeWorkout();
        streakCountRef.current += 1;
        if (!streakPaywallShown.current && streakCountRef.current >= 3) {
          openPaywall('streak', userId ?? undefined);
          streakPaywallShown.current = true;
        }
      } else {
        streakCountRef.current = 0;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate workout';
      setError(message);
      if (!premium && message.toLowerCase().includes('limit')) {
        openPaywall('daily_limit_error', userId ?? undefined);
      }
    }
  };

  const handleSave = async () => {
    if (!workout) return;
    if (!canSaveHistory) {
      requirePremium('save_history', userId ?? undefined);
      return;
    }
    try {
      setError(null);
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

  const goalOptionData = goalOptions.map((option) => {
    const disabled = !premium && !allowedGoals.includes(option.value);
    return {
      ...option,
      disabled,
      badge: disabled ? 'Premium' : undefined,
    };
  });

  const equipmentOptionData = equipmentOptions.map((option) => {
    const disabled = !premium && !allowedEquipment.includes(option.value);
    return {
      ...option,
      disabled,
      badge: disabled ? 'Premium' : undefined,
    };
  });

  const lockedFeatureButtons = useMemo(
    () => [
      { id: 'energy_level', title: 'Energy level input', subtitle: 'Dial in intensity with RPE sliders' },
      { id: 'custom_plan', title: 'Custom training plans', subtitle: 'Build multi-week programs' },
      { id: 'voice_mode', title: 'Voice coaching', subtitle: 'Hands-free cues coming soon' },
    ],
    []
  );

  const upgradeDisabled = premiumLoading || !userId;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedView style={styles.card}>
        <ThemedText type="title">Dial in your session</ThemedText>
        <ThemedText color="secondary">
          Select the time, intensity, goal, and gear you have. The AI coach will build a clean,
          block-based plan with timers.
        </ThemedText>

        {!premium && (
          <View style={styles.noticeCard}>
            <ThemedText type="subtitle">Free plan limits</ThemedText>
            <Text style={styles.noticeItem}>• 1 workout per day</Text>
            <Text style={styles.noticeItem}>• Goals: Strength & Endurance</Text>
            <Text style={styles.noticeItem}>• Equipment: Bodyweight / Minimal</Text>
            {typeof remainingFreeWorkouts === 'number' && (
              <Text style={styles.noticeItem}>
                • Workouts left today: {remainingFreeWorkouts}
              </Text>
            )}
            <Pressable
              accessibilityRole="button"
              style={[styles.upgradeButton, upgradeDisabled && styles.buttonDisabled]}
              onPress={() => openPaywall('banner', userId ?? undefined)}
              disabled={upgradeDisabled}>
              <Text style={styles.upgradeButtonText}>Start Premium · {MONTHLY_PRICE_LABEL}</Text>
            </Pressable>
            <Text style={styles.paywallText}>
              Annual plan {ANNUAL_PRICE_LABEL} — Best Value · Save 38%
            </Text>
          </View>
        )}

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
          options={goalOptionData}
          value={selection.goal}
          onChange={(goal) => setSelection((prev) => ({ ...prev, goal }))}
          onLockedPress={(option) => requirePremium(`goal:${option.value}`, userId ?? undefined)}
        />
        {!premium && (
          <Text style={styles.paywallText}>
            Premium unlocks Hypertrophy, Mobility, and Fat Loss programming.
          </Text>
        )}

        <OptionGroup
          title="Equipment"
          options={equipmentOptionData}
          value={selection.equipment}
          onChange={(equipment) => setSelection((prev) => ({ ...prev, equipment }))}
          onLockedPress={(option) => requirePremium(`equipment:${option.value}`, userId ?? undefined)}
        />
        {!premium && (
          <Text style={styles.paywallText}>
            Upgrade to access full gym and advanced equipment templates.
          </Text>
        )}

        {!premium && (
          <View style={styles.lockedFeatures}>
            <ThemedText type="subtitle">Premium tools</ThemedText>
            {lockedFeatureButtons.map((feature) => (
              <Pressable
                key={feature.id}
                accessibilityRole="button"
                style={styles.lockedFeatureButton}
                onPress={() => requirePremium(feature.id, userId ?? undefined)}>
                <View style={styles.lockedFeatureCopy}>
                  <Text style={styles.lockedFeatureTitle}>{feature.title}</Text>
                  <Text style={styles.lockedFeatureSubtitle}>{feature.subtitle}</Text>
                </View>
                <Text style={styles.lockIcon}>🔒</Text>
              </Pressable>
            ))}
          </View>
        )}

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

        {workout &&
          (canSaveHistory ? (
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
            ) : (
              <View style={styles.noticeCard}>
                <ThemedText type="subtitle">Save history with Premium</ThemedText>
                <Text style={styles.noticeItem}>
                  Keep unlimited workouts synced across devices.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  style={[styles.upgradeButton, upgradeDisabled && styles.buttonDisabled]}
                  onPress={() => openPaywall('save_history', userId ?? undefined)}
                  disabled={upgradeDisabled}>
                  <Text style={styles.upgradeButtonText}>Start Premium · {MONTHLY_PRICE_LABEL}</Text>
                </Pressable>
              </View>
            ))}
      </ThemedView>

      {workout && <WorkoutPlanView workout={workout} />}
    </ScrollView>
  );
}

type Option<T> = {
  label: string;
  value: T;
  description?: string;
  disabled?: boolean;
  badge?: string;
};

type OptionGroupProps<T> = {
  title: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  onLockedPress?: (option: Option<T>) => void;
};

function OptionGroup<T extends string | number>({
  title,
  options,
  value,
  onChange,
  onLockedPress,
}: OptionGroupProps<T>) {
  return (
    <View style={styles.optionGroup}>
      <ThemedText type="subtitle">{title}</ThemedText>
      <View style={styles.optionGrid}>
        {options.map((option) => {
          const selected = option.value === value;
          const disabled = option.disabled;
          return (
            <Pressable
              key={option.value}
              onPress={() => {
                if (disabled) {
                  onLockedPress?.(option);
                  return;
                }
                onChange(option.value);
              }}
              disabled={disabled}
              style={[
                styles.optionCard,
                selected && styles.optionCardSelected,
                disabled && styles.optionCardDisabled,
              ]}>
              <View style={styles.optionHeader}>
                <Text
                  style={[
                    styles.optionLabel,
                    selected && styles.optionLabelSelected,
                    disabled && styles.optionLabelDisabled,
                  ]}>
                  {option.label}
                </Text>
                {option.badge ? <Text style={styles.optionBadge}>{option.badge}</Text> : null}
                {disabled ? <Text style={styles.lockIcon}>🔒</Text> : null}
              </View>
              {option.description && (
                <Text
                  style={[
                    styles.optionDescription,
                    selected && styles.optionDescriptionSelected,
                    disabled && styles.optionDescriptionDisabled,
                  ]}>
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
  optionCardDisabled: {
    opacity: 0.5,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 4,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  optionLabelSelected: {
    color: '#0a7ea4',
  },
  optionLabelDisabled: {
    color: '#666',
  },
  optionBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0a7ea4',
    textTransform: 'uppercase',
  },
  optionDescription: {
    marginTop: 4,
    color: '#555',
  },
  optionDescriptionSelected: {
    color: '#0a7ea4',
  },
  optionDescriptionDisabled: {
    color: '#777',
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
  paywallText: {
    color: '#555',
    fontStyle: 'italic',
    marginTop: -4,
    marginBottom: 8,
  },
  noticeCard: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 16,
    padding: 12,
    gap: 6,
    backgroundColor: '#fdfbf5',
  },
  noticeItem: {
    color: '#555',
  },
  lockedFeatures: {
    gap: 8,
    marginBottom: 12,
  },
  lockedFeatureButton: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#f8fafc',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lockedFeatureCopy: {
    flex: 1,
    gap: 2,
  },
  lockedFeatureTitle: {
    fontWeight: '600',
    color: '#0f172a',
  },
  lockedFeatureSubtitle: {
    color: '#475569',
    fontSize: 12,
  },
  lockIcon: {
    color: '#cbd5f5',
    fontSize: 16,
    marginLeft: 8,
  },
  upgradeButton: {
    backgroundColor: '#0a7ea4',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  upgradeButtonText: {
    color: '#fff',
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
