import { ScrollView, StyleSheet, Text, View } from 'react-native';

const privacySections = [
  {
    title: '1. Introduction',
    body: [
      'This Privacy Policy explains how [Your Company] collects, uses, discloses, and protects information when you use the AI Workout Architect mobile application (“App”).',
      'By using the App you consent to the practices described here.',
    ],
  },
  {
    title: '2. Information We Collect',
    body: [
      'Account & Device Data: randomized user identifier, device model, OS version, locale, app version.',
      'Workout Inputs: time available, intensity, goals, equipment, and other fitness preferences you choose to share.',
      'Subscription Data: purchase receipts, product identifiers, and entitlement status received from Apple, Google, or RevenueCat.',
      'Usage Analytics: anonymized events such as paywall impressions, plan selections, and feature taps. We do not collect biometric data.',
    ],
  },
  {
    title: '3. How We Use Information',
    body: [
      'Generate personalized workout plans.',
      'Enforce free-tier limits and determine Premium eligibility.',
      'Provide customer support and respond to inquiries.',
      'Analyze aggregate usage to improve recommendations and app stability.',
    ],
  },
  {
    title: '4. Legal Basis',
    body: [
      'We process data to fulfill the contract with you (providing workouts and subscription access), to comply with legal obligations, and, where required, based on your consent.',
    ],
  },
  {
    title: '5. Sharing & Third Parties',
    body: [
      'RevenueCat receives purchase identifiers to manage subscriptions across platforms.',
      'Apple App Store and Google Play process payments and provide receipt validation.',
      'Analytics tools (if enabled) receive pseudonymous usage data to help us understand engagement.',
      'We do not sell personal data to third parties.',
    ],
  },
  {
    title: '6. Data Retention',
    body: [
      'Workout inputs are retained as long as needed to provide the service and enforce free-tier limits.',
      'Subscription records are retained while your premium entitlement is active and for up to 36 months afterward for compliance and fraud prevention.',
      'You may request deletion of your account by contacting privacy@yourcompany.com. We may retain limited data where legally required.',
    ],
  },
  {
    title: '7. Security',
    body: [
      'We employ industry-standard safeguards (encryption in transit, role-based access controls).',
      'No system can be 100% secure; you use the App at your own risk.',
    ],
  },
  {
    title: '8. International Transfers',
    body: [
      'Data may be processed on servers located outside your home country. We rely on standard contractual clauses or equivalent safeguards where required.',
    ],
  },
  {
    title: '9. Children',
    body: [
      'The App is not directed to children under 16. If we discover we have collected data from a child without consent, we will delete it promptly.',
    ],
  },
  {
    title: '10. Your Rights',
    body: [
      'Subject to local law, you may request access, correction, deletion, or portability of your data.',
      'Email privacy@yourcompany.com to exercise your rights or raise concerns.',
    ],
  },
  {
    title: '11. Changes to this Policy',
    body: [
      'We may update this Privacy Policy from time to time. Changes will be posted in-app with a new “Updated” date. Your continued use after the update signifies acceptance.',
    ],
  },
  {
    title: '12. Contact',
    body: [
      '[Your Company]',
      'privacy@yourcompany.com',
      '[Mailing Address]',
    ],
  },
];

export default function PrivacyScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Privacy Policy</Text>
      <Text style={styles.subtitle}>Updated: {new Date().toLocaleDateString()}</Text>

      {privacySections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.heading}>{section.title}</Text>
          {section.body.map((paragraph, idx) => (
            <Text key={idx} style={styles.body}>
              {paragraph}
            </Text>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    color: '#64748b',
  },
  section: {
    gap: 8,
  },
  heading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  body: {
    color: '#1e293b',
    lineHeight: 20,
  },
});
