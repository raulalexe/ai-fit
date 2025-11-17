import { kv } from '@vercel/kv';
import { z } from 'zod';

import { generateWorkoutRequestSchema, workoutPlanSchema } from '../lib/workout-schema';

const savePayloadSchema = z.object({
  userId: z.string().min(8),
  request: generateWorkoutRequestSchema,
  plan: workoutPlanSchema,
});

type SavePayload = z.infer<typeof savePayloadSchema>;

type StoredWorkoutRecord = {
  id: string;
  user_id: string;
  created_at: string;
  inputs: z.infer<typeof generateWorkoutRequestSchema>;
  output: z.infer<typeof workoutPlanSchema>;
};

export const config = { runtime: 'edge' };

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'content-type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const parsed = savePayloadSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Invalid payload', details: parsed.error.format() }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    const record = await storeWorkout(parsed.data);

    return new Response(JSON.stringify(record), {
      status: 201,
      headers: { 'content-type': 'application/json' },
    });
  } catch (error) {
    console.error('save-workout', error);
    return new Response(JSON.stringify({ error: 'Failed to save workout' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}

async function storeWorkout(payload: SavePayload): Promise<StoredWorkoutRecord> {
  await ensureUserRecord(payload.userId, payload.request);

  const record: StoredWorkoutRecord = {
    id: crypto.randomUUID(),
    user_id: payload.userId,
    created_at: new Date().toISOString(),
    inputs: payload.request,
    output: payload.plan,
  };

  const key = getWorkoutsKey(payload.userId);

  await kv.lpush(key, record);
  await kv.ltrim(key, 0, 49);

  return record;
}

async function ensureUserRecord(userId: string, settings: z.infer<typeof generateWorkoutRequestSchema>) {
  const userKey = getUserKey(userId);
  const created = await kv.hget<string>(userKey, 'created_at');

  if (!created) {
    await kv.hset(userKey, {
      id: userId,
      created_at: new Date().toISOString(),
    });
  }

  await kv.hset(userKey, {
    settings: JSON.stringify(settings),
    updated_at: new Date().toISOString(),
  });
}

function getUserKey(userId: string) {
  return `users:${userId}`;
}

function getWorkoutsKey(userId: string) {
  return `workouts:${userId}`;
}
