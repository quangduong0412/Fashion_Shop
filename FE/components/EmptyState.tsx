import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { palette } from './theme';
import { uiStyles } from './ui-styles';

export default function EmptyState({ text, action }: { text: string; action?: () => void }) { return <View style={styles.empty}><Ionicons name="bag-outline" size={42} color={palette.muted} /><Text style={styles.text}>{text}</Text>{action ? <Pressable style={uiStyles.primaryButton} onPress={action}><Text style={uiStyles.buttonText}>Mua sắm ngay</Text></Pressable> : null}</View>; }
const styles = StyleSheet.create({ empty: { alignItems: 'center', paddingVertical: 70, gap: 14 }, text: { color: palette.muted, fontSize: 15, textAlign: 'center' } });