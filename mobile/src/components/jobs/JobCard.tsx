/**
 * List-item card for a private job listing. Rendered inside the Jobs
 * tab's list screen (`HomeScreen`, via `JobsStackNavigator`) and
 * anywhere else a job needs a compact preview (e.g. search results,
 * saved jobs). Tapping the card navigates to `JobDetailScreen`.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '@/theme/colors';
import { FontSize, FontWeight } from '@/theme/typography';
import { BorderRadius, Spacing } from '@/theme/spacing';
import { Badge } from '@/components/common/Badge';

// Maps the raw `job_type` API value to a human-readable label shown in
// the card's Badge. Falls back to the raw value itself (see JOB_TYPE_LABELS
// usage below) if a job_type isn't in this map.
const JOB_TYPE_LABELS: Record<string, string> = {
  full_time: 'Full Time',
  part_time: 'Part Time',
  contract: 'Contract',
  internship: 'Internship',
};

/**
 * Props for `JobCard`.
 * - `job`: the job listing data to display —
 *   - `id`: job's unique identifier.
 *   - `title`: job title, shown truncated to 2 lines.
 *   - `company_name`: posting company's name.
 *   - `city`: job location.
 *   - `job_type`: raw job type key (looked up in `JOB_TYPE_LABELS`).
 *   - `salary_min` (optional): minimum salary in rupees; when present,
 *     rendered as "₹X.XL+" (converted to lakhs).
 *   - `salary_max` (optional): maximum salary in rupees; currently
 *     accepted in the type but not rendered by this card.
 *   - `created_at`: ISO timestamp the job was posted; currently
 *     accepted in the type but not rendered by this card.
 * - `onPress`: handler invoked when the card is tapped — the caller
 *   (list screen) supplies navigation to `JobDetailScreen` with this
 *   job's id.
 */
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

/**
 * JobCard
 *
 * Renders a tappable card summarizing a job listing: title, company,
 * city, a job-type Badge, and (if available) a formatted minimum
 * salary. Used as the list-item renderer for job listing screens.
 *
 * Props: see `Props` interface above.
 */
export function JobCard({ job, onPress }: Props) {
  return (
    // Card press -> fires onPress, which the caller wires up to navigate
    // to JobDetailScreen (e.g. navigation.navigate('JobDetail', { id: job.id })).
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.title} numberOfLines={2}>{job.title}</Text>
      <Text style={styles.company}>{job.company_name}</Text>
      <Text style={styles.location}>{job.city}</Text>
      <View style={styles.footer}>
        {/* Look up a friendly label for job_type; fall back to the raw value if unmapped. */}
        <Badge label={JOB_TYPE_LABELS[job.job_type] ?? job.job_type} />
        {/* Salary is optional in the API — only shown when salary_min is present.
            Converted from rupees to lakhs (÷100000) and shown as e.g. "₹5.0L+". */}
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
