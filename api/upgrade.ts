import { z } from 'zod';

import { verifyReceipt } from '../lib/billing';
import { planIntervals } from '../lib/plans';
import {
  getUserProfile,
  saveSubscriptionRecord,
  serializeProfileResponse,
  upgradeUserProfile,
} from '../lib/user-profile';

const bodySchema = z.object({
  userId: z.string().min(8),
  provider: z.literal('stripe'),
  plan: z.enum(planIntervals),
  receipt: z.string().min(4),
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

    const verification = await verifyReceipt(parsed.data.provider, parsed.data.receipt, parsed.data.plan);
    const subscriptionRecord = {
      provider: verification.provider,
      plan: verification.plan,
      receiptId: verification.receiptId,
      amount: verification.amount,
      currency: verification.currency,
      purchasedAt: verification.purchasedAt,
      expiresAt: verification.expiresAt,
    };

    await saveSubscriptionRecord(parsed.data.userId, subscriptionRecord);
    const profile = await upgradeUserProfile(parsed.data.userId, subscriptionRecord);
    const payload = await serializeProfileResponse(profile);

    return Response.json(payload);
  } catch (error) {
    console.error('upgrade', error);
    return new Response(JSON.stringify({ error: 'Failed to upgrade user' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}
