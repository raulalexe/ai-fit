import { z } from 'zod';

export const intensityLevels = ['low', 'medium', 'high'] as const;
export const goalOptions = ['strength', 'hypertrophy', 'endurance', 'mobility', 'fat_loss'] as const;
export const equipmentOptions = ['bodyweight', 'minimal', 'full_gym'] as const;

export const generateWorkoutRequestSchema = z.object({
  time: z.number().int().min(10).max(120),
  intensity: z.enum(intensityLevels),
  goal: z.enum(goalOptions),
  equipment: z.enum(equipmentOptions),
  userId: z.string().min(8).optional(),
});

export const workoutExerciseSchema = z.object({
  id: z.string(),
  name: z.string(),
  prescription: z.string(),
  equipment: z.string().optional(),
  notes: z.array(z.string()).optional().default([]),
});

export const workoutBlockSchema = z.object({
  id: z.string(),
  title: z.string(),
  focus: z.string(),
  durationMinutes: z.number().min(3).max(90),
  instructions: z.string(),
  timerSeconds: z.number().int().min(60).max(3600),
  exercises: z.array(workoutExerciseSchema).min(1),
  tips: z.array(z.string()).optional().default([]),
});

export const workoutPlanSchema = z.object({
  summary: z.string(),
  totalDurationMinutes: z.number().min(10).max(180),
  warmup: z.array(z.string()).optional().default([]),
  cooldown: z.array(z.string()).optional().default([]),
  finisher: z.array(z.string()).optional().default([]),
  metrics: z.object({
    intensity: z.enum(intensityLevels),
    rpeTarget: z.string(),
    estimatedCalories: z.number().optional(),
  }),
  blocks: z.array(workoutBlockSchema).min(2),
});

export type GenerateWorkoutPayload = z.infer<typeof generateWorkoutRequestSchema>;
export type WorkoutPlan = z.infer<typeof workoutPlanSchema>;
export type WorkoutBlock = z.infer<typeof workoutBlockSchema>;
export type WorkoutExercise = z.infer<typeof workoutExerciseSchema>;
