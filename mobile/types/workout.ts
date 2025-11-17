export type IntensityLevel = 'low' | 'medium' | 'high';
export type GoalOption = 'strength' | 'hypertrophy' | 'endurance' | 'mobility' | 'fat_loss';
export type EquipmentOption = 'bodyweight' | 'minimal' | 'full_gym';

export interface WorkoutSelection {
  time: number;
  intensity: IntensityLevel;
  goal: GoalOption;
  equipment: EquipmentOption;
}

export interface WorkoutExercise {
  id: string;
  name: string;
  prescription: string;
  equipment?: string;
  notes?: string[];
}

export interface WorkoutBlock {
  id: string;
  title: string;
  focus: string;
  durationMinutes: number;
  instructions: string;
  timerSeconds: number;
  tips?: string[];
  exercises: WorkoutExercise[];
}

export interface WorkoutPlan {
  summary: string;
  totalDurationMinutes: number;
  warmup: string[];
  finisher: string[];
  cooldown: string[];
  metrics: {
    intensity: IntensityLevel;
    rpeTarget: string;
    estimatedCalories?: number;
  };
  blocks: WorkoutBlock[];
}

export interface WorkoutResponse {
  request: WorkoutSelection;
  plan: WorkoutPlan;
}

export interface StoredWorkout extends WorkoutResponse {
  id: string;
  savedAt: string;
}
