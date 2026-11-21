/**
 * JobDetailScreen.tsx
 *
 * Full-detail view for a single private job listing. Belongs to the Jobs
 * tab's stack navigator (and is also reachable from the Home tab's
 * search results/latest-jobs feed, and SavedJobsScreen), pushed when a
 * job card is tapped.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Linking } from 'react-native';
import { jobService } from '@/services/jobService';
import { Button } from '@/components/common/Button';
import { Spinner } from '@/components/common/Spinner';
import { Badge } from '@/components/common/Badge';
import { ScreenWrapper } from '@/components/common/ScreenWrapper';
import { useThemeColors, ThemeColors } from '@/theme/colors';
import { FontSize, FontWeight } from '@/theme/typography';
import { Spacing } from '@/theme/spacing';

const JOB_TYPE_LABELS: Record<string, string> = {
  full_time: 'Full Time', part_time: 'Part Time', contract: 'Contract', internship: 'Internship',
};

/**
 * Renders full details for one private job listing: title, company,
 * location, job type badge, salary range, and description, plus an
 * "Apply Now" action that redirects to the company's own careers page.
 * Reads `route.params.jobId` (the job's numeric id) to fetch the record.
 * Use case: destination screen when a job seeker taps a listing from
 * `HomeScreen`, `HomeTabScreen`'s search results/latest-jobs feed, or
 * `SavedJobsScreen`.
 */
export function JobDetailScreen({ route }: { route: any }) {
  const { jobId } = route.params;
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const Colors = useThemeColors();
  const styles = makeStyles(Colors);

  // Fetches the full job record from GET /jobs/{jobId}/ whenever jobId
  // changes, clearing the loading state once the request settles.
  useEffect(() => {
    jobService.get(jobId).then(({ data }) => setJob(data)).finally(() => setLoading(false));
  }, [jobId]);

  // Loading state: show a spinner until the fetch above resolves
  if (loading) return <Spinner />;
  // Defensive guard: render nothing if the job failed to load (e.g. 404)
  if (!job) return null;

  // Apply action: records the click (for the company's analytics
  // dashboard) via jobService.trackClick, then opens the returned
  // redirect URL; falls back to the job record's own redirect_url if
  // tracking fails, so Apply never breaks. This app never hosts an
  // application form — it always redirects to the company's own careers page.
  const handleApply = async () => {
    try {
      const { data } = await jobService.trackClick(job.id);
      await Linking.openURL(data.redirect_url);
    } catch {
      await Linking.openURL(job.redirect_url);
    }
  };

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{job.title}</Text>
        <Text style={styles.company}>{job.company_name}</Text>
        <Text style={styles.location}>{job.location}</Text>
        <Badge label={JOB_TYPE_LABELS[job.job_type] ?? job.job_type} />
        {/* Salary range only rendered when the listing has salary_min set */}
        {job.salary_min && (
          <Text style={styles.salary}>
            ₹{(job.salary_min / 100000).toFixed(1)}L – ₹{(job.salary_max / 100000).toFixed(1)}L
          </Text>
        )}
        <View style={styles.divider} />
        {/* Strips HTML tags from the rich-text (TipTap) description before
            rendering as plain text */}
        <Text style={styles.description}>{job.description?.replace(/<[^>]*>/g, '') || ''}</Text>
        <View style={styles.applyButton}>
          <Button title="Apply Now →" onPress={handleApply} />
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const makeStyles = (Colors: ThemeColors) => StyleSheet.create({
  container: { padding: Spacing[5] },
  title: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text },
  company: { fontSize: FontSize.base, color: Colors.textSecondary, marginTop: Spacing[1] },
  location: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 4, marginBottom: Spacing[3] },
  salary: { fontSize: FontSize.base, color: Colors.success, fontWeight: FontWeight.semibold, marginTop: Spacing[2] },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing[5] },
  description: { fontSize: FontSize.base, color: Colors.text, lineHeight: 24 },
  applyButton: { marginTop: Spacing[8] },
});
