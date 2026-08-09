import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Linking } from 'react-native';
import { jobService } from '@/services/jobService';
import { Button } from '@/components/common/Button';
import { Spinner } from '@/components/common/Spinner';
import { Badge } from '@/components/common/Badge';
import { ScreenWrapper } from '@/components/common/ScreenWrapper';
import { Colors } from '@/theme/colors';
import { FontSize, FontWeight } from '@/theme/typography';
import { Spacing } from '@/theme/spacing';

const JOB_TYPE_LABELS: Record<string, string> = {
  full_time: 'Full Time', part_time: 'Part Time', contract: 'Contract', internship: 'Internship',
};

export function JobDetailScreen({ route }: { route: any }) {
  const { jobId } = route.params;
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    jobService.get(jobId).then(({ data }) => setJob(data)).finally(() => setLoading(false));
  }, [jobId]);

  if (loading) return <Spinner />;
  if (!job) return null;

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{job.title}</Text>
        <Text style={styles.company}>{job.company_name}</Text>
        <Text style={styles.location}>{job.location}</Text>
        <Badge label={JOB_TYPE_LABELS[job.job_type] ?? job.job_type} />
        {job.salary_min && (
          <Text style={styles.salary}>
            ₹{(job.salary_min / 100000).toFixed(1)}L – ₹{(job.salary_max / 100000).toFixed(1)}L
          </Text>
        )}
        <View style={styles.divider} />
        <Text style={styles.description}>{job.description?.replace(/<[^>]*>/g, '') || ''}</Text>
        <View style={styles.applyButton}>
          <Button
            title="Apply Now →"
            onPress={() => Linking.openURL(job.redirect_url)}
          />
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing[5] },
  title: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text },
  company: { fontSize: FontSize.base, color: Colors.textSecondary, marginTop: Spacing[1] },
  location: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 4, marginBottom: Spacing[3] },
  salary: { fontSize: FontSize.base, color: Colors.success, fontWeight: FontWeight.semibold, marginTop: Spacing[2] },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing[5] },
  description: { fontSize: FontSize.base, color: Colors.text, lineHeight: 24 },
  applyButton: { marginTop: Spacing[8] },
});
