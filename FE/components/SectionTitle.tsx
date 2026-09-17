import { PropsWithChildren } from 'react';
import { StyleSheet, Text } from 'react-native';
import { palette } from './theme';

export default function SectionTitle({ children }: PropsWithChildren) { return <Text style={styles.title}>{children}</Text>; }
const styles = StyleSheet.create({ title: { color: palette.ink, fontSize: 23, fontWeight: '800', marginBottom: 14 } });