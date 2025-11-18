import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Purchases from 'react-native-purchases';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUserId } from '@/hooks/use-user-id';
import { usePremiumStore } from '@/src/stores/premiumStore';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <PremiumInitializer />
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          <Stack.Screen
            name="paywall"
            options={{
              presentation: 'fullScreenModal',
              headerShown: false,
            }}
          />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function PremiumInitializer() {
  const { userId } = useUserId();
  const refreshPremiumStatus = usePremiumStore((state) => state.refreshPremiumStatus);

  useEffect(() => {
    if (!userId) return;
    const revenuecatKey = process.env.EXPO_PUBLIC_REVENUECAT_KEY;
    if (revenuecatKey) {
      Purchases.setDebugLogsEnabled(__DEV__);
      Purchases.configure({ apiKey: revenuecatKey, appUserID: userId });
    }
    refreshPremiumStatus(userId);
  }, [userId, refreshPremiumStatus]);

  return null;
}
