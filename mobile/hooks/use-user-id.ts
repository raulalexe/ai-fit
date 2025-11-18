import { useEffect, useState } from 'react';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const STORAGE_KEY = 'ai-workout-user-id';

async function generateId() {
  const bytes = await Crypto.getRandomBytesAsync(16);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function loadUserId() {
  const existing = await SecureStore.getItemAsync(STORAGE_KEY);
  if (existing) {
    return existing;
  }
  const next = await generateId();
  await SecureStore.setItemAsync(STORAGE_KEY, next);
  return next;
}

export function useUserId() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    loadUserId()
      .then((id) => {
        if (mounted) {
          setUserId(id);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return { userId, loading };
}
