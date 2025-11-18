import { FREE_DAILY_WORKOUT_LIMIT, getUsageCount } from '../lib/user-profile';

const VERIFY_KEY = process.env.VERIFY_SUBSCRIPTION_API_KEY;
const REVENUECAT_API_KEY = process.env.REVENUECAT_API_KEY;

const RC_ENDPOINT = 'https://api.revenuecat.com/v1/subscribers';

export const config = { runtime: 'edge' };

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'content-type': 'application/json' },
    });
  }

  if (!VERIFY_KEY || !REVENUECAT_API_KEY) {
    return new Response(JSON.stringify({ error: 'Server misconfigured.' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  const providedKey = request.headers.get('x-api-key');
  if (providedKey !== VERIFY_KEY) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const userId = body?.userId;

    if (!userId || typeof userId !== 'string' || userId.length < 3) {
      return new Response(JSON.stringify({ error: 'Invalid user id' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    const revenueCatResponse = await fetch(`${RC_ENDPOINT}/${encodeURIComponent(userId)}`, {
      headers: {
        Authorization: `Bearer ${REVENUECAT_API_KEY}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!revenueCatResponse.ok) {
      const premiumPayload = {
        premium: false,
        entitlementExpiration: null,
        remainingFreeWorkouts: await getRemainingWorkouts(userId),
      };
      return respondWithCache(premiumPayload, revenueCatResponse.status === 404 ? 200 : 502);
    }

    const data = await revenueCatResponse.json();
    const entitlement = data?.subscriber?.entitlements?.premium;
    const expiration = entitlement?.expires_date ?? null;
    const premium = Boolean(entitlement && (!expiration || new Date(expiration) > new Date()));

    const payload = {
      premium,
      entitlementExpiration: expiration,
      remainingFreeWorkouts: premium ? null : await getRemainingWorkouts(userId),
    };

    return respondWithCache(payload);
  } catch (error) {
    console.error('verify-subscription', error);
    return new Response(JSON.stringify({ error: 'Unable to verify subscription' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}

async function getRemainingWorkouts(userId: string) {
  const used = await getUsageCount(userId);
  return Math.max(FREE_DAILY_WORKOUT_LIMIT - used, 0);
}

function respondWithCache(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json',
      'cache-control': 's-maxage=600',
    },
  });
}
