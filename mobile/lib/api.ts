import Constants from 'expo-constants';

import type { StoredWorkout, WorkoutResponse, WorkoutSelection } from '@/types/workout';

const API_BASE_URL =
  Constants?.expoConfig?.extra?.apiBaseUrl ??
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  'http://localhost:3000';

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

export async function generateWorkout(selection: WorkoutSelection & { userId?: string }) {
  const response = await fetch(`${API_BASE_URL}/api/generate-workout`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(selection),
  });

  return handleResponse<WorkoutResponse>(response);
}

export async function saveWorkout(userId: string, workout: WorkoutResponse) {
  const response = await fetch(`${API_BASE_URL}/api/workouts`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ userId, ...workout }),
  });

  return handleResponse<StoredWorkout>(response);
}

export async function fetchWorkouts(userId: string) {
  const response = await fetch(`${API_BASE_URL}/api/workouts?userId=${userId}`);
  const payload = await handleResponse<{ data: StoredWorkout[] }>(response);
  return payload.data;
}
