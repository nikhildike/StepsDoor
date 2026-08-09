import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Linking } from 'react-native';
import { govtJobService } from '@/services/govtJobService';
import { Button } from '@/components/common/Button';
import { Spinner } from '@/components/common/Spinner';
import { Badge } from '@/components/common/Badge';
import { ScreenWrapper } from '@/components/common/ScreenWrapper';
import { Colors } from '@/theme/colors';
import { FontSize, FontWeight } from '@/theme/typography';
import { Spacing } from '@/theme/spacing';

export function GovtJobDetailScreen({ route }: { route: any }) {
  const { jobId } = route.params;
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    govtJobService.get(jobId).then(({ data }) => setJob(data)).finally(() => setLoading(false));
  }, [jobId]);

  if (loading) return <Spinner />;
  if (!job) return null;

  const lastDate = job.last_date
    ? new Date(job.last_date).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : null;

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{job.title}</Text>
        <Text style={styles.org}>{job.organisation}</Text>
        <Text style={styles.state}>{job.state}</Text>
        <View style={styles.row}>
          <Badge label={job.category} />
          {job.vacancies && (
            <Text style={styles.vacancies}>{job.vacancies} vacancies</Text>
          )}
        </View>
        {lastDate && (
          <View style={styles.deadlineBox}>
            <Text style={styles.deadlineLabel}>Last Date to Apply</Text>
            <Text style={styles.deadlineDate}>{lastDate}</Text>
          </View>
        )}
        {job.qualification && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Qualification</Text>
            <Text style={styles.sectionBody}>{job.qualification}</Text>
          </View>
        )}
        <View style={styles.divider} />
        {job.description ? (
          <Text style={styles.description}>{job.description}</Text>
        ) : null}
        {job.apply_url && (
          <View style={styles.actionButton}>
            <Button
              title="Apply Now →"
              onPress={() => Linking.openURL(job.apply_url)}
            />
          </View>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing[5] },
  title: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text },
  org: { fontSize: FontSize.base, color: Colors.textSecondary, marginTop: Spacing[1] },
  state: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 4, marginBottom: Spacing[3] },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing[3] },
  vacancies: { fontSize: FontSize.base, color: Colors.primary, fontWeight: FontWeight.semibold },
  deadlineBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: Spacing[4],
    marginBottom: Spacing[3],
  },
  deadlineLabel: { fontSize: FontSize.xs, color: Colors.warning, fontWeight: FontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.5 },
  deadlineDate: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text, marginTop: 4 },
  section: { marginBottom: Spacing[3] },
  sectionTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textSecondary, marginBottom: 4 },
  sectionBody: { fontSize: FontSize.base, color: Colors.text },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing[4] },
  description: { fontSize: FontSize.base, color: Colors.text, lineHeight: 24 },
  actionButton: { marginTop: Spacing[8] },
});
