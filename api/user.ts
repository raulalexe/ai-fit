import { z } from 'zod';

import { getUserProfile, serializeProfileResponse } from '../lib/user-profile';

const querySchema = z.object({
  userId: z.string().min(8),
});

export const config = { runtime: 'edge' };

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'content-type': 'application/json' },
    });
  }

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({ userId: searchParams.get('userId') });

  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'userId is required' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const profile = await getUserProfile(parsed.data.userId);
  return Response.json(serializeProfileResponse(profile));
}
