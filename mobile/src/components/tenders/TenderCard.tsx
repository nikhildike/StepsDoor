import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '@/theme/colors';
import { FontSize, FontWeight } from '@/theme/typography';
import { BorderRadius, Spacing } from '@/theme/spacing';
import { Badge } from '@/components/common/Badge';

interface Props {
  tender: {
    id: number;
    title: string;
    organisation: string;
    state: string;
    category: string;
    estimated_value?: number;
    submission_deadline?: string;
  };
  onPress: () => void;
}

export function TenderCard({ tender, onPress }: Props) {
  const deadline = tender.submission_deadline
    ? new Date(tender.submission_deadline).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
      })
    : null;

  const isExpiringSoon = tender.submission_deadline
    ? (new Date(tender.submission_deadline).getTime() - Date.now()) < 3 * 86400000
    : false;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.title} numberOfLines={2}>{tender.title}</Text>
      <Text style={styles.org}>{tender.organisation}</Text>
      <Text style={styles.state}>{tender.state}</Text>
      <View style={styles.footer}>
        <Badge label={tender.category} />
        {deadline && (
          <Text style={[styles.deadline, isExpiringSoon && styles.deadlineUrgent]}>
            Due: {deadline}
          </Text>
        )}
      </View>
      {tender.estimated_value && (
        <Text style={styles.value}>
          Est. value: ₹{(tender.estimated_value / 100000).toFixed(1)}L
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing[4],
    marginBottom: Spacing[3],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.text },
  org: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 4 },
  state: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing[3] },
  deadline: { fontSize: FontSize.xs, color: Colors.textSecondary },
  deadlineUrgent: { color: Colors.error, fontWeight: FontWeight.semibold },
  value: { fontSize: FontSize.xs, color: Colors.success, marginTop: Spacing[2], fontWeight: FontWeight.medium },
});
