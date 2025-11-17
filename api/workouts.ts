import { kv } from '@vercel/kv';
import { z } from 'zod';

import { generateWorkoutRequestSchema, workoutPlanSchema } from '../lib/workout-schema';

const savePayloadSchema = z.object({
  userId: z.string().min(8),
  request: generateWorkoutRequestSchema,
  plan: workoutPlanSchema,
});

const storedWorkoutSchema = z.object({
  id: z.string(),
  savedAt: z.string(),
  request: generateWorkoutRequestSchema,
  plan: workoutPlanSchema,
});

export type StoredWorkout = z.infer<typeof storedWorkoutSchema>;

export const config = { runtime: 'edge' };

export default async function handler(request: Request): Promise<Response> {
  switch (request.method) {
    case 'GET':
      return handleGet(request);
    case 'POST':
      return handlePost(request);
    default:
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'content-type': 'application/json' },
      });
  }
}

async function handleGet(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return new Response(JSON.stringify({ error: 'userId is required' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const key = getKey(userId);
  const items = (await kv.lrange<StoredWorkout>(key, 0, 19)) ?? [];

  return Response.json({ data: items });
}

async function handlePost(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const parsed = savePayloadSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Invalid payload', details: parsed.error.format() }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    const record: StoredWorkout = {
      id: crypto.randomUUID(),
      savedAt: new Date().toISOString(),
      request: parsed.data.request,
      plan: parsed.data.plan,
    };

    const key = getKey(parsed.data.userId);

    await kv.lpush(key, record);
    await kv.ltrim(key, 0, 19);

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

function getKey(userId: string) {
  return `workouts:${userId}`;
}
