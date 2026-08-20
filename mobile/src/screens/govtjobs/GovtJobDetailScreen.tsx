/**
 * GovtJobDetailScreen.tsx
 *
 * Full-detail view for a single government job listing. Belongs to the
 * Govt Jobs tab's stack navigator (list → detail), pushed from
 * `GovtJobsScreen` when a card is tapped.
 */
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

/**
 * Renders full details for one government job: title, organisation, state,
 * category, vacancies, application deadline, qualification, description, and
 * an "Apply Now" action. Reads `route.params.jobId` (the govt job's numeric
 * id) to fetch the record. Use case: destination screen when a job seeker
 * taps a listing in `GovtJobsScreen` to read more and apply externally.
 */
export function GovtJobDetailScreen({ route }: { route: any }) {
  const { jobId } = route.params;
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetches the full govt job record from GET /govtjobs/{jobId}/ whenever
  // jobId changes, and clears the loading state once the request settles.
  useEffect(() => {
    govtJobService.get(jobId).then(({ data }) => setJob(data)).finally(() => setLoading(false));
  }, [jobId]);

  // Loading state: show a spinner until the fetch above resolves
  if (loading) return <Spinner />;
  // Defensive guard: render nothing if the job failed to load (e.g. 404)
  if (!job) return null;

  // Formats last_date (ISO string) into a readable Indian locale date, or
  // null if the job has no application deadline.
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
          {/* Vacancy count is optional on the backend; hide the row if absent */}
          {job.vacancies && (
            <Text style={styles.vacancies}>{job.vacancies} vacancies</Text>
          )}
        </View>
        {/* Deadline callout box, only rendered when the job has a last_date */}
        {lastDate && (
          <View style={styles.deadlineBox}>
            <Text style={styles.deadlineLabel}>Last Date to Apply</Text>
            <Text style={styles.deadlineDate}>{lastDate}</Text>
          </View>
        )}
        {/* Qualification section, only shown when the field is populated */}
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
        {/* Apply action: opens the external apply_url in the device browser,
            only shown when the backend provides one */}
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
