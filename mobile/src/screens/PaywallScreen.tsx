import ConfettiCannon from 'react-native-confetti-cannon';
import Purchases, { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
} from 'react-native';

import { PlanCard } from '@/src/components/PlanCard';
import { PremiumFeatureList } from '@/src/components/PremiumFeatureList';
import { usePremium } from '@/src/hooks/usePremium';
import { trackEvent } from '@/src/utils/analytics';
import { useUserId } from '@/hooks/use-user-id';
import type { PlanInterval } from '@/src/types/premium';

const FEATURES = [
  'Unlimited personalized workouts',
  'All training goals unlocked',
  'Custom equipment support',
  'Workout history & progress',
  'Advanced AI recommendations',
  'Voice coaching (later)',
  'Personalized programs (later)',
] as const;

const TERMS_URL = 'https://example.com/terms';
const PRIVACY_URL = 'https://example.com/privacy';

export default function PaywallScreen() {
  const router = useRouter();
  const { userId } = useUserId();
  const { premium, refreshPremiumStatus } = usePremium();
  const [selectedPlan, setSelectedPlan] = useState<PlanInterval>('annual');
  const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const result = await Purchases.getOfferings();
        if (mounted) {
          setOfferings(result.current ?? null);
        }
      } catch (error) {
        console.warn('Failed to load offerings', error);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (premium) {
      router.replace('/(tabs)/index');
    }
  }, [premium, router]);

  useEffect(() => {
    if (!premium && userId) {
      trackEvent('paywall_viewed', { userId });
    }
  }, [premium, userId]);

  const plans = useMemo(() => {
    const annualPrice =
      offerings?.annual?.product?.priceString ?? offerings?.availablePackages?.find((pkg) => pkg.packageType === 'ANNUAL')?.product?.priceString ?? '$59/year';
    const monthlyPrice =
      offerings?.monthly?.product?.priceString ?? offerings?.availablePackages?.find((pkg) => pkg.packageType === 'MONTHLY')?.product?.priceString ?? '$7.99/mo';
    return {
      monthly: {
        title: 'Monthly',
        price: monthlyPrice,
        cadence: '$7.99 per month',
        description: 'Flexibility & zero commitment',
        package: offerings?.monthly ?? null,
      },
      annual: {
        title: 'Annual',
        price: annualPrice,
        cadence: '$59 per year',
        description: 'Best Value – Save 38%',
        badge: 'Best Value – Save 38%',
        package: offerings?.annual ?? null,
      },
    };
  }, [offerings]);

  const purchasePackage = (plan: PlanInterval): PurchasesPackage | null => {
    if (plan === 'annual') {
      return plans.annual.package ?? null;
    }
    return plans.monthly.package ?? null;
  };

  const showToast = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert(message);
    }
  };

  const handleSelectPlan = (plan: PlanInterval) => {
    setSelectedPlan(plan);
    trackEvent('paywall_plan_selected', { plan, userId });
  };

  const handlePurchase = async () => {
    if (!userId) return;
    const pkg = purchasePackage(selectedPlan);
    if (!pkg) {
      setPurchaseError('Plan unavailable. Please try again later.');
      return;
    }
    setPurchaseError(null);
    setIsLoading(true);
    trackEvent('paywall_purchase_clicked', { plan: selectedPlan, userId });
    try {
      const purchase = await Purchases.purchasePackage(pkg);
      const entitlement = purchase.customerInfo.entitlements.active?.premium;
      if (entitlement) {
        trackEvent('paywall_purchase_succeeded', { plan: selectedPlan, userId });
        await refreshPremiumStatus(userId);
        setShowConfetti(true);
        showToast("You're Premium! Enjoy unlimited training.");
        setTimeout(() => {
          router.replace('/(tabs)/index');
        }, 1500);
      } else {
        throw new Error('Premium entitlement missing.');
      }
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && error.code === Purchases.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED) {
        showToast('Purchase cancelled');
      } else {
        const message = error instanceof Error ? error.message : 'Purchase failed';
        setPurchaseError(message);
        trackEvent('paywall_purchase_failed', { plan: selectedPlan, userId, error: message });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!userId) return;
    setRestoring(true);
    setPurchaseError(null);
    try {
      const restore = await Purchases.restorePurchases();
      const entitlement = restore.entitlements.active?.premium;
      if (entitlement) {
        await refreshPremiumStatus(userId);
        showToast('Purchases restored. Welcome back!');
        router.replace('/(tabs)/index');
      } else {
        setPurchaseError('No active purchases found.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to restore purchases.';
      setPurchaseError(message);
    } finally {
      setRestoring(false);
    }
  };

  const handleFreePlan = () => {
    router.back();
  };

  const handleLink = (url: string) => {
    Linking.openURL(url).catch(() => showToast('Unable to open link'));
  };

  const currentPlanPrice = selectedPlan === 'monthly' ? plans.monthly.price : plans.annual.price;
  const disablePurchase = isLoading || (!plans.annual.package && !plans.monthly.package);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} bounces={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Unlock Premium Training</Text>
          <Text style={styles.subtitle}>Train smarter with unlimited AI-powered workouts.</Text>
        </View>

        <View style={styles.planRow}>
          <PlanCard
            title="Monthly"
            price={plans.monthly.price}
            cadence="Billed monthly"
            description="Perfect for testing the waters"
            selected={selectedPlan === 'monthly'}
            onSelect={() => handleSelectPlan('monthly')}
          />
          <PlanCard
            title="Annual"
            price={plans.annual.price}
            cadence="Billed yearly"
            badge="Best Value – Save 38%"
            description="Commit & save 38% vs monthly"
            selected={selectedPlan === 'annual'}
            onSelect={() => handleSelectPlan('annual')}
          />
        </View>

        <PremiumFeatureList features={[...FEATURES]} />

        {purchaseError ? <Text style={styles.error}>{purchaseError}</Text> : null}
        {!plans.monthly.package && !plans.annual.package ? (
          <Text style={styles.offline}>Connect to the internet to view purchase options.</Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          style={[styles.primaryButton, disablePurchase && styles.buttonDisabled]}
          disabled={disablePurchase}
          onPress={handlePurchase}>
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Start Premium · {currentPlanPrice}</Text>
          )}
        </Pressable>

        <Pressable accessibilityRole="button" style={styles.secondaryButton} onPress={handleFreePlan}>
          <Text style={styles.secondaryButtonText}>Continue with Free Plan</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          style={styles.secondaryButton}
          onPress={handleRestore}
          disabled={restoring}>
          {restoring ? (
            <ActivityIndicator color="#0a7ea4" />
          ) : (
            <Text style={styles.secondaryButtonText}>Restore Purchases</Text>
          )}
        </Pressable>

        <View style={styles.footer}>
          <Text style={styles.footerLink} onPress={() => handleLink(TERMS_URL)}>
            Terms of Use
          </Text>
          <Text style={styles.footerDivider}>•</Text>
          <Text style={styles.footerLink} onPress={() => handleLink(PRIVACY_URL)}>
            Privacy Policy
          </Text>
        </View>

        <Text style={styles.footerNote}>Restore Purchases · Terms of Use · Privacy Policy</Text>
      </ScrollView>

      {showConfetti ? (
        <ConfettiCannon count={120} origin={{ x: 0, y: 0 }} fadeOut onAnimationEnd={() => setShowConfetti(false)} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 24,
    paddingBottom: 48,
    gap: 24,
  },
  header: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  subtitle: {
    color: '#475569',
    fontSize: 16,
    textAlign: 'center',
  },
  planRow: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#0a7ea4',
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#94a3b8',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#0a7ea4',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  footerLink: {
    color: '#0a7ea4',
    textDecorationLine: 'underline',
  },
  footerDivider: {
    color: '#94a3b8',
  },
  footerNote: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 12,
  },
  error: {
    color: '#b3261e',
    textAlign: 'center',
  },
  offline: {
    color: '#f97316',
    textAlign: 'center',
  },
});
