import { Pressable, StyleSheet, Text, View } from 'react-native';

type PlanCardProps = {
  title: string;
  price: string;
  cadence: string;
  badge?: string;
  description?: string;
  selected: boolean;
  onSelect: () => void;
};

export function PlanCard({
  title,
  price,
  cadence,
  badge,
  description,
  selected,
  onSelect,
}: PlanCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onSelect}
      style={[styles.card, selected && styles.cardSelected]}>
      <View style={styles.header}>
        <Text style={[styles.title, selected && styles.titleSelected]}>{title}</Text>
        {badge ? <Text style={styles.badge}>{badge}</Text> : null}
      </View>
      <Text style={[styles.price, selected && styles.priceSelected]}>{price}</Text>
      <Text style={styles.cadence}>{cadence}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d7e3fc',
    borderRadius: 18,
    padding: 16,
    gap: 6,
    backgroundColor: '#fff',
  },
  cardSelected: {
    borderColor: '#0a7ea4',
    backgroundColor: '#f0f9ff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  titleSelected: {
    color: '#0a7ea4',
  },
  badge: {
    backgroundColor: '#ffedd5',
    color: '#c2410c',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  price: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
  },
  priceSelected: {
    color: '#0a7ea4',
  },
  cadence: {
    color: '#475569',
    fontWeight: '500',
  },
  description: {
    color: '#475569',
  },
});
