import { Image } from 'expo-image';
import type { ImageContentFit } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import type { ComponentProps } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { ImageStyle, StyleProp, ViewStyle } from 'react-native';
import { Colors } from '../constants/theme';
import { mediaUrl } from './catalog-media';

type Props = { source?: string | null; label: string; style?: StyleProp<ImageStyle>; contentFit?: ImageContentFit; fallbackIcon?: ComponentProps<typeof MaterialIcons>['name']; fallbackLabel?: string };

export default function CatalogImage({ source, label, style, contentFit = 'cover', fallbackIcon = 'image-not-supported', fallbackLabel = 'Ảnh đang cập nhật' }: Props) {
  const url = mediaUrl(source);
  const [failedUrl, setFailedUrl] = useState(''), [loadingUrl, setLoadingUrl] = useState('');
  const available = !!url && failedUrl !== url;
  return <View style={[styles.root, style as StyleProp<ViewStyle>]} accessibilityLabel={available ? label : `${label}. ${fallbackLabel}`}>
    {available ? <Image key={url} source={url} accessibilityLabel={label} style={StyleSheet.absoluteFill} contentFit={contentFit} transition={150} onLoadStart={() => setLoadingUrl(url)} onLoad={() => setLoadingUrl('')} onError={() => { setFailedUrl(url); setLoadingUrl(''); }} /> : <View style={styles.fallback}><MaterialIcons name={fallbackIcon} size={30} color={Colors.light.primary} />{!!fallbackLabel && <Text style={styles.caption}>{fallbackLabel}</Text>}</View>}
    {available && loadingUrl === url && <View pointerEvents="none" style={styles.loading}><ActivityIndicator color={Colors.light.primary} /></View>}
  </View>;
}
const styles = StyleSheet.create({
  root: { overflow: 'hidden', backgroundColor: Colors.light.surfaceContainerLow },
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  caption: { fontFamily: 'Inter', fontSize: 11, color: Colors.light.onSurfaceVariant, textAlign: 'center' },
  loading: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(251,248,255,0.35)' },
});
