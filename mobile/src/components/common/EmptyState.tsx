/**
 * Centered placeholder shown in place of a list/screen when there is no
 * data to display (e.g. no jobs matching filters, no saved items, no
 * alerts). Optionally includes a description and an action element
 * (e.g. a `Button` to retry or clear filters).
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/theme/colors';
import { FontSize, FontWeight } from '@/theme/typography';
import { Spacing } from '@/theme/spacing';

/**
 * Props for `EmptyState`.
 * - `title`: required headline text (e.g. "No jobs found").
 * - `description`: optional supporting text shown below the title.
 * - `action`: optional arbitrary React node (typically a `Button`)
 *   rendered below the description for a corrective action.
 */
interface Props {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

/**
 * EmptyState
 *
 * Fills available space (flex: 1) and centers a title, optional
 * description, and optional action node. Used by list screens across
 * Jobs/Tenders/Govt Jobs/Alerts/Saved Jobs whenever a fetched list is
 * empty.
 *
 * Props: see `Props` interface above.
 */
export function EmptyState({ title, description, action }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {/* Description is optional — only rendered when provided. */}
      {description && <Text style={styles.description}>{description}</Text>}
      {/* Action (e.g. a retry/clear-filters Button) is optional — only rendered when provided. */}
      {action && <View style={styles.action}>{action}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing[8] },
  title: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, color: Colors.text, textAlign: 'center' },
  description: { fontSize: FontSize.base, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing[2] },
  action: { marginTop: Spacing[5] },
});
