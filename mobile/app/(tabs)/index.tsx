import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { equipmentOptions, goalOptions, intensityOptions, timeOptions } from '@/constants/workout';
import { useMembership } from '@/hooks/use-membership';
import { useUserId } from '@/hooks/use-user-id';
import { useGenerateWorkout, useSaveWorkout } from '@/hooks/use-workout-api';
import type { WorkoutBlock, WorkoutResponse, WorkoutSelection } from '@/types/workout';
import type { PlanInterval } from '@/types/user';

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

export default function HomeScreen() {
  const { userId, loading: loadingUser } = useUserId();
  const { profile: membership, loading: loadingMembership, upgrade } = useMembership(userId);
  const generateWorkoutMutation = useGenerateWorkout(userId);
  const saveWorkoutMutation = useSaveWorkout(userId);
  const [selection, setSelection] = useState<WorkoutSelection>(defaultSelection);
  const [workout, setWorkout] = useState<WorkoutResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanInterval>('monthly');
  const [receiptInput, setReceiptInput] = useState('');

  const tier = membership?.tier ?? 'free';
  const premiumMonthly = membership?.pricing.monthly ?? '5.99';
  const premiumAnnual = membership?.pricing.annual ?? '59.99';
  const allowedGoals =
    membership?.limits.allowedGoals ?? (tier === 'free' ? freeGoalValues : allGoalValues);
  const allowedEquipment =
    membership?.limits.allowedEquipment ??
    (tier === 'free' ? freeEquipmentValues : allEquipmentValues);
  const canSaveHistory = tier === 'premium';
  const disableActions =
    loadingUser || loadingMembership || !userId || generateWorkoutMutation.isPending;

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
    if (!workout || !canSaveHistory) return;
    try {
      setError(null);
      await saveWorkoutMutation.mutateAsync(workout);
      setStatusMessage('Workout saved to your library.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save workout');
    }
  };

  const handleUpgrade = async () => {
    if (!userId) return;
    if (!receiptInput.trim()) {
      setError('Enter your Stripe Checkout Session ID to upgrade.');
      return;
    }
    setError(null);
    try {
      await upgrade.mutateAsync({
        userId,
        provider: 'stripe',
        plan: selectedPlan,
        receipt: receiptInput.trim(),
      });
      setReceiptInput('');
      setStatusMessage('Welcome to Premium — unlimited workouts unlocked.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upgrade failed. Try again.');
    }
  };

  const actionLabel = useMemo(() => {
    if (loadingUser) return 'Preparing profile...';
    if (generateWorkoutMutation.isPending) return 'Generating...';
    return 'Generate Workout';
  }, [loadingUser, generateWorkoutMutation.isPending]);

  const goalOptionData = goalOptions.map((option) => {
    const disabled = tier === 'free' && !allowedGoals.includes(option.value);
    return {
      ...option,
      disabled,
      badge: disabled ? 'Premium' : undefined,
    };
  });

  const equipmentOptionData = equipmentOptions.map((option) => {
    const disabled = tier === 'free' && !allowedEquipment.includes(option.value);
    return {
      ...option,
      disabled,
      badge: disabled ? 'Premium' : undefined,
    };
  });

  const upgradeDisabled = upgrade.isPending || !userId || receiptInput.trim().length < 4;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedView style={styles.card}>
        <ThemedText type="title">Dial in your session</ThemedText>
        <ThemedText color="secondary">
          Select the time, intensity, goal, and gear you have. The AI coach will build a clean,
          block-based plan with timers.
        </ThemedText>

        {tier === 'free' && (
          <View style={styles.noticeCard}>
            <ThemedText type="subtitle">Free plan limits</ThemedText>
            <Text style={styles.noticeItem}>• 1 workout per day</Text>
            <Text style={styles.noticeItem}>• Goals: Strength & Endurance</Text>
            <Text style={styles.noticeItem}>• Equipment: Bodyweight / Minimal</Text>
            {typeof membership?.remainingFreeWorkouts === 'number' && (
              <Text style={styles.noticeItem}>
                • Workouts left today: {membership.remainingFreeWorkouts}
              </Text>
            )}
            <View style={styles.planToggle}>
              {(['monthly', 'annual'] as PlanInterval[]).map((plan) => {
                const price = plan === 'monthly' ? premiumMonthly : premiumAnnual;
                const active = selectedPlan === plan;
                return (
                  <Pressable
                    key={plan}
                    accessibilityRole="button"
                    style={[styles.planButton, active && styles.planButtonActive]}
                    onPress={() => setSelectedPlan(plan)}>
                    <Text style={[styles.planButtonLabel, active && styles.planButtonLabelActive]}>
                      {plan === 'monthly' ? `Monthly · $${price}` : `Annual · $${price}`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <TextInput
              placeholder="Enter Stripe Checkout Session ID"
              placeholderTextColor="#777"
              autoCapitalize="none"
              autoCorrect={false}
              value={receiptInput}
              onChangeText={setReceiptInput}
              style={styles.receiptInput}
            />
            <Pressable
              accessibilityRole="button"
              style={[styles.upgradeButton, upgradeDisabled && styles.buttonDisabled]}
              onPress={handleUpgrade}
              disabled={upgradeDisabled}>
              <Text style={styles.upgradeButtonText}>
                Upgrade for {selectedPlan === 'monthly' ? `$${premiumMonthly}/mo` : `$${premiumAnnual}/yr`}
              </Text>
            </Pressable>
            <Text style={styles.paywallText}>
              Paste the receipt ID you receive from Stripe Checkout. Purchases are verified instantly.
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
        />
        {tier === 'free' && (
          <Text style={styles.paywallText}>
            Premium unlocks Hypertrophy, Mobility, and Fat Loss programming.
          </Text>
        )}

        <OptionGroup
          title="Equipment"
          options={equipmentOptionData}
          value={selection.equipment}
          onChange={(equipment) => setSelection((prev) => ({ ...prev, equipment }))}
        />
        {tier === 'free' && (
          <Text style={styles.paywallText}>
            Upgrade to access full gym and advanced equipment templates.
          </Text>
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
                onPress={handleUpgrade}
                disabled={upgradeDisabled}>
                {upgrade.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.upgradeButtonText}>
                      Upgrade for {selectedPlan === 'monthly' ? `$${premiumMonthly}/mo` : `$${premiumAnnual}/yr`}
                  </Text>
                )}
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
};

function OptionGroup<T extends string | number>({ title, options, value, onChange }: OptionGroupProps<T>) {
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
                if (disabled) return;
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
  planToggle: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  planButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#c7d7e5',
    alignItems: 'center',
  },
  planButtonActive: {
    backgroundColor: '#0a7ea4',
    borderColor: '#0a7ea4',
  },
  planButtonLabel: {
    color: '#0a7ea4',
    fontWeight: '600',
    fontSize: 13,
  },
  planButtonLabelActive: {
    color: '#fff',
  },
  receiptInput: {
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111',
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
