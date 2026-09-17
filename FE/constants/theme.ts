/**
 * Crimson Sartorial Design System
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    primary: '#b6152b',
    primaryContainer: '#d93340',
    onPrimary: '#ffffff',
    secondary: '#1E3A5F', // Midnight Navy
    secondaryContainer: '#b5d0fd',
    onSecondary: '#ffffff',
    tertiary: '#D4AF37', // Champagne Gold
    surface: '#fbf8ff',
    surfaceContainerLowest: '#ffffff',
    surfaceContainerLow: '#f4f2ff',
    surfaceContainer: '#edecff',
    surfaceContainerHigh: '#e6e6ff',
    background: '#fbf8ff',
    error: '#ba1a1a',
    onSurface: '#181a2e',
    onSurfaceVariant: '#5b403f',
    outline: '#8f6f6e',
    outlineVariant: '#e3bebc',
    text: '#181a2e',
    tint: '#b6152b',
    tabIconDefault: '#1E3A5F',
    tabIconSelected: '#b6152b',
  },
  dark: {
    // Basic dark mapping for compatibility
    primary: '#ffb3b1',
    primaryContainer: '#d93340',
    onPrimary: '#410007',
    secondary: '#adc8f5',
    onSecondary: '#001c3b',
    surface: '#181a2e',
    background: '#181a2e',
    text: '#f1efff',
    tint: '#ffb3b1',
    tabIconDefault: '#8f97a3',
    tabIconSelected: '#ffb3b1',
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'Inter',
    serif: 'Playfair Display',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'Inter',
    serif: 'Playfair Display',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    serif: "'Playfair Display', Georgia, serif",
    rounded: "'SF Pro Rounded', sans-serif",
    mono: "monospace",
  },
});
