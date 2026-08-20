/**
 * Small pill-shaped label used to tag list-item cards (e.g. job type on
 * `JobCard`, category on `TenderCard`) with a color-coded status/category.
 * Purely presentational — no interaction, no navigation.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/theme/colors';
import { FontSize } from '@/theme/typography';
import { BorderRadius, Spacing } from '@/theme/spacing';

/**
 * Props for `Badge`.
 * - `label`: text displayed inside the pill.
 * - `variant`: color scheme to use, one of 'primary' | 'success' |
 *   'warning' | 'error'. Defaults to 'primary' when omitted.
 */
interface Props {
  label: string;
  variant?: 'primary' | 'success' | 'warning' | 'error';
}

// Background/text color pairs per variant. `primary` colors come from the
// theme (`Colors.primaryLight` / `Colors.primary`); the success/warning/error
// backgrounds are fixed hex tints paired with their theme text colors
// (Colors.success / Colors.warning / Colors.error) since no matching
// "light" background tokens exist in the theme module.
const variantColors = {
  primary: { bg: Colors.primaryLight, text: Colors.primary },
  success: { bg: '#D1FAE5', text: Colors.success },
  warning: { bg: '#FEF3C7', text: Colors.warning },
  error: { bg: '#FEE2E2', text: Colors.error },
};

/**
 * Badge
 *
 * Renders a rounded pill containing `label`, colored per `variant`.
 * Props:
 *  - `label` (string, required): text shown inside the badge.
 *  - `variant` ('primary' | 'success' | 'warning' | 'error', optional,
 *    default 'primary'): selects the background/text color pair from
 *    `variantColors`.
 *
 * Used by `JobCard` (job type tag) and `TenderCard` (category tag), and
 * anywhere else a small color-coded status label is needed.
 */
export function Badge({ label, variant = 'primary' }: Props) {
  // Resolve the background/text colors for the requested variant.
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
