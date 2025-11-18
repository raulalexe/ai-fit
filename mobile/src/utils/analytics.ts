type AnalyticsEvent =
  | 'paywall_viewed'
  | 'paywall_plan_selected'
  | 'paywall_purchase_clicked'
  | 'paywall_purchase_succeeded'
  | 'paywall_purchase_failed'
  | 'feature_locked_clicked';

type EventPayload = Record<string, unknown>;

export function trackEvent(event: AnalyticsEvent, payload: EventPayload = {}) {
  const enriched = {
    event,
    timestamp: new Date().toISOString(),
    ...payload,
  };

  // In production, send to your analytics pipeline (e.g., Segment, Amplitude).
  if (__DEV__) {
    console.log('[analytics]', enriched);
  }
}
