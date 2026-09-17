import { View, TextInput, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';

interface SearchBarProps {
  placeholder?: string;
  onSearch?: (text: string) => void;
  showFilterBtn?: boolean;
  onFilterPress?: () => void;
}

export default function SearchBar({ placeholder = "Tìm kiếm...", onSearch, showFilterBtn, onFilterPress }: SearchBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.searchBox}>
        <MaterialIcons name="search" size={20} color={Colors.light.secondary} style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={Colors.light.outline}
          onChangeText={onSearch}
        />
        {showFilterBtn && (
          <Pressable style={styles.filterBtn} onPress={onFilterPress}>
            <MaterialIcons name="tune" size={20} color={Colors.light.onSurfaceVariant} />
            <View style={styles.badge} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.surfaceContainerLow,
    borderRadius: 999,
    paddingHorizontal: 16,
    height: 44,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontFamily: 'Inter',
    fontSize: 14,
    color: Colors.light.onSurface,
  },
  filterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.light.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginLeft: 8,
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.light.primary,
    borderWidth: 1,
    borderColor: Colors.light.surface,
  },
});
