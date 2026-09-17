import { StyleSheet } from 'react-native';
import { palette } from './theme';

export const uiStyles = StyleSheet.create({
  primaryButton: { backgroundColor: palette.red, borderRadius: 7, paddingVertical: 11, paddingHorizontal: 14, alignItems: 'center' },
  buttonText: { color: palette.white, fontWeight: '800' },
});