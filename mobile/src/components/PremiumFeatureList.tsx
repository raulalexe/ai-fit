import { StyleSheet, Text, View } from 'react-native';

type PremiumFeatureListProps = {
  features: string[];
};

export function PremiumFeatureList({ features }: PremiumFeatureListProps) {
  return (
    <View style={styles.list}>
      {features.map((feature) => (
        <View key={feature} style={styles.row}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.text}>{feature}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 8,
    marginVertical: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bullet: {
    color: '#0a7ea4',
    fontSize: 18,
    lineHeight: 20,
  },
  text: {
    flex: 1,
    color: '#0f172a',
    fontSize: 15,
    lineHeight: 20,
  },
});
