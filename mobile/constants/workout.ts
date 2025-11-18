import type { EquipmentOption, GoalOption, IntensityLevel } from '@/types/workout';

export const timeOptions = [20, 30, 45, 60, 75, 90];

export const intensityOptions: Array<{ label: string; value: IntensityLevel; description: string }> = [
  { label: 'Low', value: 'low', description: 'Intentional tempo, RPE 5-6' },
  { label: 'Medium', value: 'medium', description: 'Challenging but sustainable' },
  { label: 'High', value: 'high', description: 'Aggressive pacing, RPE 8-9' },
];

export const goalOptions: Array<{ label: string; value: GoalOption; description: string }> = [
  { label: 'Strength', value: 'strength', description: 'Heavy lifts, neural drive' },
  { label: 'Hypertrophy', value: 'hypertrophy', description: 'Volume + mind-muscle' },
  { label: 'Endurance', value: 'endurance', description: 'Longer efforts & aerobic' },
  { label: 'Mobility', value: 'mobility', description: 'Control, range, tempo' },
  { label: 'Fat Loss', value: 'fat_loss', description: 'Mixed modalities, density' },
];

export const equipmentOptions: Array<{ label: string; value: EquipmentOption; description: string }> = [
  { label: 'Bodyweight', value: 'bodyweight', description: 'No equipment required' },
  { label: 'Minimal', value: 'minimal', description: 'Bands, bells, light gear' },
  { label: 'Full Gym', value: 'full_gym', description: 'Barbells, racks, machines' },
];
