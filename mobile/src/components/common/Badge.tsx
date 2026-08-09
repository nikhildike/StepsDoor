import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/theme/colors';
import { FontSize } from '@/theme/typography';
import { BorderRadius, Spacing } from '@/theme/spacing';

interface Props {
  label: string;
  variant?: 'primary' | 'success' | 'warning' | 'error';
}

const variantColors = {
  primary: { bg: Colors.primaryLight, text: Colors.primary },
  success: { bg: '#D1FAE5', text: Colors.success },
  warning: { bg: '#FEF3C7', text: Colors.warning },
  error: { bg: '#FEE2E2', text: Colors.error },
};

export function Badge({ label, variant = 'primary' }: Props) {
  const { bg, text } = variantColors[variant];
  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing[2],
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  text: { fontSize: FontSize.xs, fontWeight: '600' },
});
