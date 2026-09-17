import { Pressable, StyleSheet, Text } from 'react-native';
import { Colors } from '../constants/theme';

interface CategoryChipProps {
  label: string;
  isActive?: boolean;
  onPress?: () => void;
}

export default function CategoryChip({ label, isActive, onPress }: CategoryChipProps) {
  return (
    <Pressable
      style={[
        styles.chip,
        isActive ? styles.chipActive : styles.chipInactive
      ]}
      onPress={onPress}
    >
      <Text style={[
        styles.text,
        isActive ? styles.textActive : styles.textInactive
      ]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: Colors.light.primary,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  chipInactive: {
    backgroundColor: Colors.light.surfaceContainer,
  },
  text: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  textActive: {
    color: Colors.light.onPrimary,
  },
  textInactive: {
    color: Colors.light.onSurfaceVariant,
  },
});
