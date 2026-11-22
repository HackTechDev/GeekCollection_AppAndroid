import { Pressable, StyleSheet, Text } from 'react-native';

import { colors } from '../theme';

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
};

export function Chip({ label, selected = false, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [styles.chip, selected && styles.selected, pressed && styles.pressed]}
    >
      <Text style={[styles.label, selected && styles.selectedLabel]}>{label}</Text>
    </Pressable>
  );
}

/** Petite étiquette non cliquable (format, vu, prêté…). */
export function Badge({ label, color, background }: { label: string; color: string; background: string }) {
  return <Text style={[styles.badge, { color, backgroundColor: background }]}>{label}</Text>;
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
  pressed: { opacity: 0.7 },
  label: { fontSize: 13, color: colors.text, fontWeight: '500' },
  selectedLabel: { color: '#fff' },
  badge: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
});
