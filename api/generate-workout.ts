import { runStructuredWorkoutPrompt } from '../lib/ai';
import { buildWorkoutPrompt } from '../lib/prompt';
import {
  assertDailyWorkoutQuota,
  assertFreeTierAccess,
  getUserProfile,
  recordDailyUsage,
  TierLimitError,
  updateUserSettings,
} from '../lib/user-profile';
import {
  generateWorkoutRequestSchema,
  workoutPlanSchema,
  type WorkoutPlan,
} from '../lib/workout-schema';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'content-type': 'application/json' },
    });
  }

    try {
      const payload = await request.json();
      const parsed = generateWorkoutRequestSchema.safeParse(payload);

      if (!parsed.success) {
        return new Response(JSON.stringify({ error: 'Invalid request', details: parsed.error.format() }), {
          status: 400,
          headers: { 'content-type': 'application/json' },
        });
      }

      const profile = await getUserProfile(parsed.data.userId);
      await assertFreeTierAccess(profile, parsed.data);
      await assertDailyWorkoutQuota(profile);

      const prompt = buildWorkoutPrompt(parsed.data);
      const raw = await runStructuredWorkoutPrompt(prompt);

      const plan = parsePlan(raw);

      await recordDailyUsage(profile);
      await updateUserSettings(parsed.data);

      return Response.json(
        {
          request: parsed.data,
          plan,
        },
        { status: 200 }
      );
    } catch (error) {
      if (error instanceof TierLimitError) {
        return new Response(JSON.stringify({ error: error.message, code: error.code }), {
          status: error.status,
          headers: { 'content-type': 'application/json' },
        });
      }

      console.error('generate-workout: ', error);
      return new Response(JSON.stringify({ error: 'Failed to generate workout' }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      });
    }
}

function parsePlan(raw: string): WorkoutPlan {
  let candidate: unknown = null;

  try {
    candidate = JSON.parse(raw);
  } catch {
    throw new Error('AI response was not valid JSON.');
  }

  const parsed = workoutPlanSchema.safeParse(candidate);

  if (!parsed.success) {
    throw new Error('AI response did not match schema.');
  }

  return parsed.data;
}
