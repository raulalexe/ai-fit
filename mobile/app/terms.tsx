import { ScrollView, StyleSheet, Text, View } from 'react-native';

const sections = [
  {
    title: '1. Agreement Overview',
    body: [
      'By accessing or using the AI Workout Architect mobile application (“App”), you acknowledge that you have read, understood, and agree to be bound by these Terms of Use (“Terms”). If you do not agree, discontinue use immediately.',
      'The App is provided by [Your Company]. References to “we,” “us,” or “our” refer to [Your Company].',
    ],
  },
  {
    title: '2. Eligibility',
    body: [
      'You must be at least 16 years old to use the App. If you are between 16 and 18, your legal guardian must review these Terms and consent to your use.',
    ],
  },
  {
    title: '3. Subscription & Billing',
    body: [
      'Premium access is offered through auto-renewing subscriptions processed by Apple App Store or Google Play. Pricing is displayed within the App (currently $7.99/month or $59/year, subject to change).',
      'Subscriptions renew automatically unless canceled at least 24 hours before the end of the current period. Manage or cancel via your App Store / Google Play settings. We cannot process cancellations on your behalf.',
      'Partial-period refunds are not provided except where required by applicable law.',
    ],
  },
  {
    title: '4. Health & Safety Disclaimer',
    body: [
      'Always consult with a physician or qualified health provider before beginning any exercise program. The App’s workouts are generated algorithmically and may not account for your personal medical history, injuries, or limitations.',
      'You assume all risks associated with physical activity. [Your Company] is not liable for injuries, illnesses, or damages arising from reliance on the App’s recommendations.',
    ],
  },
  {
    title: '5. User Responsibilities',
    body: [
      'Provide accurate input data when generating workouts.',
      'Use appropriate form, equipment, and safety gear.',
      'Cease any activity that causes pain, dizziness, shortness of breath, or other concerning symptoms and seek medical advice.',
    ],
  },
  {
    title: '6. License & Restrictions',
    body: [
      'We grant you a limited, non-transferable license to access and use the App for personal, non-commercial purposes.',
      'You may not copy, modify, reverse engineer, resell, or exploit the App or its content.',
      'You may not use the App for any unlawful purpose or in violation of applicable laws.',
    ],
  },
  {
    title: '7. Intellectual Property',
    body: [
      'All content, trademarks, logos, and code remain the property of [Your Company] or its licensors.',
      'You retain rights to data you input, but grant us a license to use anonymized data to operate and improve the App.',
    ],
  },
  {
    title: '8. Disclaimer of Warranties',
    body: [
      'THE APP IS PROVIDED “AS IS” AND “AS AVAILABLE.” WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING FITNESS FOR A PARTICULAR PURPOSE, MERCHANTABILITY, AND NON-INFRINGEMENT.',
      'We do not warrant that workouts will meet your expectations, be error-free, or produce specific outcomes.',
    ],
  },
  {
    title: '9. Limitation of Liability',
    body: [
      'TO THE MAXIMUM EXTENT PERMITTED BY LAW, [YOUR COMPANY] IS NOT LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING PERSONAL INJURY, LOST PROFITS, OR DATA LOSS, EVEN IF ADVISED OF THE POSSIBILITY.',
      'Our total liability for claims arising from the App will not exceed the amount you paid to use the service in the twelve (12) months preceding the claim.',
    ],
  },
  {
    title: '10. Indemnification',
    body: [
      'You agree to indemnify and hold harmless [Your Company], its affiliates, officers, directors, employees, and agents from any claims or damages arising from your misuse of the App or violation of these Terms.',
    ],
  },
  {
    title: '11. Termination',
    body: [
      'We may suspend or terminate access to the App at any time for violation of these Terms or suspicious activity.',
      'You may stop using the App at any time; subscriptions remain active until canceled through the app store.',
    ],
  },
  {
    title: '12. Changes to the App or Terms',
    body: [
      'We may update the App or these Terms at any time. Material changes will be posted in-app or on our website. Continued use after changes constitutes acceptance.',
    ],
  },
  {
    title: '13. Governing Law',
    body: [
      'These Terms are governed by the laws of the jurisdiction where [Your Company] is formed, without regard to conflict-of-law principles.',
      'Any disputes will be resolved in the courts located in that jurisdiction unless applicable law requires otherwise.',
    ],
  },
  {
    title: '14. Contact',
    body: [
      'For questions about these Terms, contact us at legal@yourcompany.com.',
    ],
  },
];

export default function TermsScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Terms of Use</Text>
      <Text style={styles.subtitle}>Updated: {new Date().toLocaleDateString()}</Text>

      {sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.heading}>{section.title}</Text>
          {section.body.map((paragraph, index) => (
            <Text key={index} style={styles.body}>
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
