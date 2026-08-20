/**
 * Shared full-space loading indicator. Used as a placeholder while a
 * screen's data (jobs, tenders, govt jobs, alerts, etc.) is being
 * fetched, before the real content or an `EmptyState` can be rendered.
 */
import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { Colors } from '@/theme/colors';

/**
 * Spinner
 *
 * Renders a centered `ActivityIndicator` filling available space
 * (flex: 1), tinted with the theme's primary color. Used by list/detail
 * screens across the app during initial data loading.
 *
 * Props (inline type, no separate interface):
 *  - `size` ('small' | 'large', optional, default 'large'): passed
 *    directly to `ActivityIndicator`'s `size` prop.
 */
export function Spinner({ size = 'large' }: { size?: 'small' | 'large' }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={Colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
});
