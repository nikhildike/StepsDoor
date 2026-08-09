import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '@/theme/colors';
import { FontSize, FontWeight } from '@/theme/typography';
import { BorderRadius, Spacing } from '@/theme/spacing';
import { Badge } from '@/components/common/Badge';

const JOB_TYPE_LABELS: Record<string, string> = {
  full_time: 'Full Time',
  part_time: 'Part Time',
  contract: 'Contract',
  internship: 'Internship',
};

interface Props {
  job: {
    id: number;
    title: string;
    company_name: string;
    city: string;
    job_type: string;
    salary_min?: number;
    salary_max?: number;
    created_at: string;
  };
  onPress: () => void;
}

export function JobCard({ job, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.title} numberOfLines={2}>{job.title}</Text>
      <Text style={styles.company}>{job.company_name}</Text>
      <Text style={styles.location}>{job.city}</Text>
      <View style={styles.footer}>
        <Badge label={JOB_TYPE_LABELS[job.job_type] ?? job.job_type} />
        {job.salary_min && (
          <Text style={styles.salary}>
            ₹{(job.salary_min / 100000).toFixed(1)}L+
          </Text>
        )}
      </View>
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
  company: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 4 },
  location: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing[3] },
  salary: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.success },
});
