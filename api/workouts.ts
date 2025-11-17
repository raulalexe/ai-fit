import { kv } from '@vercel/kv';
import { z } from 'zod';

import { generateWorkoutRequestSchema, workoutPlanSchema } from '../lib/workout-schema';

const querySchema = z.object({
  userId: z.string().min(8),
});

const storedWorkoutRecordSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  created_at: z.string(),
  inputs: generateWorkoutRequestSchema,
  output: workoutPlanSchema,
});

export type StoredWorkoutRecord = z.infer<typeof storedWorkoutRecordSchema>;

export const config = { runtime: 'edge' };

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'content-type': 'application/json' },
    });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  const parsed = querySchema.safeParse({ userId });

  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'userId is required and must be valid' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const key = getWorkoutsKey(parsed.data.userId);
  const items = (await kv.lrange<StoredWorkoutRecord>(key, 0, 49)) ?? [];

  return Response.json({ data: items });
}

function getWorkoutsKey(userId: string) {
  return `workouts:${userId}`;
}
