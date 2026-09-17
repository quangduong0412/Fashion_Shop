import { Ionicons } from '@expo/vector-icons';
import { PropsWithChildren } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { palette } from './theme';

export default function Page({ children, title, onBack }: PropsWithChildren<{ title?: string; onBack?: () => void }>) {
  return <ScrollView style={styles.page} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>{title ? <View style={styles.pageTitle}>{onBack ? <Pressable onPress={onBack}><Ionicons name="arrow-back" size={22} color={palette.ink} /></Pressable> : null}<Text style={styles.title}>{title}</Text></View> : null}{children}</ScrollView>;
}

const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: '#fffaf8' }, content: { padding: 20, paddingBottom: 40 }, pageTitle: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }, title: { color: palette.ink, fontSize: 27, fontWeight: '800' } });