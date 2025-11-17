import { z } from 'zod';

import { getUserProfile, serializeProfileResponse, upgradeUserProfile } from '../lib/user-profile';

const bodySchema = z.object({
  userId: z.string().min(8),
});

export const config = { runtime: 'edge' };

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'content-type': 'application/json' },
    });
  }

  try {
    const payload = await request.json();
    const parsed = bodySchema.safeParse(payload);

    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Invalid payload', details: parsed.error.format() }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    await upgradeUserProfile(parsed.data.userId);
    const profile = await getUserProfile(parsed.data.userId);

    return Response.json(serializeProfileResponse(profile));
  } catch (error) {
    console.error('upgrade', error);
    return new Response(JSON.stringify({ error: 'Failed to upgrade user' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}
