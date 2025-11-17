import Constants from 'expo-constants';

import type {
  GenerateWorkoutRequest,
  StoredWorkout,
  WorkoutPlan,
  WorkoutResponse,
  WorkoutSelection,
} from '@/types/workout';
import type { UserProfile } from '@/types/user';

const API_BASE_URL =
  Constants?.expoConfig?.extra?.apiBaseUrl ??
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  'http://localhost:3000';

type ApiStoredWorkout = {
  id: string;
  user_id: string;
  created_at: string;
  inputs: GenerateWorkoutRequest;
  output: WorkoutPlan;
};

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = 'Request failed';
    try {
      const payload = await response.json();
      message = payload.error ?? message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export async function generateWorkout(selection: WorkoutSelection & { userId: string }) {
  const response = await fetch(`${API_BASE_URL}/api/generate-workout`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(selection),
  });

  return handleResponse<WorkoutResponse>(response);
}

export async function saveWorkout(userId: string, workout: WorkoutResponse) {
  const response = await fetch(`${API_BASE_URL}/api/save-workout`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ userId, ...workout }),
  });

  const payload = await handleResponse<ApiStoredWorkout>(response);
  return normalizeWorkout(payload);
}

export async function fetchWorkouts(userId: string) {
  const response = await fetch(`${API_BASE_URL}/api/workouts?userId=${encodeURIComponent(userId)}`);
  const payload = await handleResponse<{ data: ApiStoredWorkout[] }>(response);
  return payload.data.map(normalizeWorkout);
}

export async function fetchUserProfile(userId: string) {
  const response = await fetch(`${API_BASE_URL}/api/user?userId=${encodeURIComponent(userId)}`);
  return handleResponse<UserProfile>(response);
}

export async function upgradeUser(userId: string) {
  const response = await fetch(`${API_BASE_URL}/api/upgrade`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  return handleResponse<UserProfile>(response);
}

function normalizeWorkout(input: ApiStoredWorkout): StoredWorkout {
  return {
    id: input.id,
    savedAt: input.created_at,
    request: input.inputs,
    plan: input.output,
  };
}
