import Stripe from 'stripe';

import { env } from './env';
import type { PlanInterval } from './plans';

export type BillingProvider = 'stripe';

export interface ReceiptVerification {
  provider: BillingProvider;
  receiptId: string;
  amount: number;
  currency: string;
  plan: PlanInterval;
  purchasedAt: string;
  expiresAt: string;
  raw: unknown;
}

const stripeClient = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    })
  : null;

export async function verifyReceipt(
  provider: BillingProvider,
  receipt: string,
  plan: PlanInterval
): Promise<ReceiptVerification> {
  switch (provider) {
    case 'stripe':
      return verifyStripeReceipt(receipt, plan);
    default:
      throw new Error(`Unsupported billing provider: ${provider}`);
  }
}

async function verifyStripeReceipt(receiptId: string, plan: PlanInterval): Promise<ReceiptVerification> {
  if (!stripeClient) {
    throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY.');
  }

  const session = await stripeClient.checkout.sessions.retrieve(receiptId);

  if (session.payment_status !== 'paid') {
    throw new Error('Stripe checkout session is not paid.');
  }

  const purchasedAt = new Date().toISOString();
  const expiresAt = calculateExpiry(purchasedAt, plan);

  return {
    provider: 'stripe',
    receiptId: session.id,
    amount: session.amount_total ?? 0,
    currency: session.currency ?? 'usd',
    plan,
    purchasedAt,
    expiresAt,
    raw: session,
  };
}

function calculateExpiry(startIso: string, plan: PlanInterval) {
  const start = new Date(startIso);
  if (plan === 'annual') {
    start.setUTCFullYear(start.getUTCFullYear() + 1);
  } else {
    start.setUTCMonth(start.getUTCMonth() + 1);
  }
  return start.toISOString();
}
