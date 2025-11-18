import { API_BASE_URL } from '@/lib/api';

export interface VerifySubscriptionResponse {
  premium: boolean;
  entitlementExpiration?: string | null;
  remainingFreeWorkouts: number | null;
}

const API_KEY = process.env.EXPO_PUBLIC_VERIFY_SUBSCRIPTION_KEY ?? '';

export async function verifySubscriptionRequest(userId: string): Promise<VerifySubscriptionResponse> {
  const response = await fetch(`${API_BASE_URL}/api/verify-subscription`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': API_KEY,
    },
    body: JSON.stringify({ userId }),
  });

  if (!response.ok) {
    let message = 'Unable to verify subscription';
    try {
      const payload = await response.json();
      message = payload.error ?? message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return response.json() as Promise<VerifySubscriptionResponse>;
}
