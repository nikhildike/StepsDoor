/**
 * CompanyCareersScreen.tsx
 *
 * StepsDoor's own branded "careers page" for a single subscribed
 * company — the page a company card actually links to, not the
 * company's own (often-unset) external `website` field. Mirrors
 * `frontend/src/pages/public/CompanyCareers.jsx`: fetches the company
 * profile plus its currently active job listings in one call via
 * `companyService.careers(slug)`, and lets a job seeker apply straight
 * from here without drilling into each job's own detail screen. Reached
 * by tapping a company card in `HomeScreen`'s Companies segment.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, Image, FlatList, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { companyService } from '@/services/companyService';
import { jobService } from '@/services/jobService';
import { Spinner } from '@/components/common/Spinner';
import { EmptyState } from '@/components/common/EmptyState';
import { ScreenWrapper } from '@/components/common/ScreenWrapper';
import { CompanyDirectorySection } from '@/components/companies/CompanyDirectorySection';
import { useThemeColors, ThemeColors } from '@/theme/colors';
import { FontSize, FontWeight } from '@/theme/typography';
import { BorderRadius, Spacing } from '@/theme/spacing';

// Job type value -> display label, mirrors the backend JobPost.job_type choices.
const JOB_TYPE_LABELS: Record<string, string> = {
  full_time: 'Full Time', part_time: 'Part Time', contract: 'Contract', internship: 'Internship',
};

interface CompanyProfile {
  name: string;
  logo?: string | null;
  description?: string;
  website?: string;
  contact_email?: string;
}

interface OpenJob {
  id: number;
  title: string;
  city: string;
  job_type: string;
  salary_min?: number;
  salary_max?: number;
  redirect_url: string;
}

/**
 * A single open-position row on the careers page, with an inline Apply
 * button. Tapping Apply records the click via `jobService.trackClick`
 * (for the company's analytics dashboard) then opens the redirect URL;
 * falls back to the job's own `redirect_url` if tracking fails, so Apply
 * never breaks.
 *
 * @param job - The job to render (see `OpenJob` interface above).
 */
function OpenJobCard({ job }: { job: OpenJob }) {
  const Colors = useThemeColors();
  const styles = makeStyles(Colors);

  const handleApply = async () => {
    try {
      const { data } = await jobService.trackClick(job.id);
      await Linking.openURL(data.redirect_url);
    } catch {
      await Linking.openURL(job.redirect_url);
    }
  };

  // Formats the salary range for display, or null when unset.
  const salary = job.salary_min && job.salary_max
    ? `₹${(job.salary_min / 100000).toFixed(1)}L – ₹${(job.salary_max / 100000).toFixed(1)}L/yr`
    : job.salary_min
    ? `From ₹${(job.salary_min / 100000).toFixed(1)}L/yr`
    : null;

  return (
    <View style={styles.jobCard}>
      <View style={styles.jobInfo}>
        <Text style={styles.jobTitle} numberOfLines={2}>{job.title}</Text>
        <View style={styles.jobMetaRow}>
          <Text style={styles.jobMeta}>{job.city}</Text>
          <Text style={styles.jobMetaDot}>·</Text>
          <Text style={styles.jobMeta}>{JOB_TYPE_LABELS[job.job_type] ?? job.job_type}</Text>
        </View>
        {salary ? <Text style={styles.jobSalary}>{salary}</Text> : null}
      </View>
      <TouchableOpacity style={styles.applyButton} onPress={handleApply} activeOpacity={0.8}>
        <Text style={styles.applyButtonText}>Apply →</Text>
      </TouchableOpacity>
    </View>
  );
}

/**
 * Renders a company's branded careers page: header (logo, name,
 * description, website/contact) plus its list of currently open job
 * postings. Reads `route.params.slug` (the company's URL slug) to fetch
 * the record. Use case: destination screen when a job seeker taps a
 * company card in `HomeScreen`'s Companies segment.
 */
export function CompanyCareersScreen({ route }: { route: any }) {
  const { slug } = route.params;
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [jobs, setJobs] = useState<OpenJob[]>([]);
  const [loading, setLoading] = useState(true);
  const Colors = useThemeColors();
  const styles = makeStyles(Colors);

  // Fetches the company profile + its open jobs together whenever the
  // slug changes. A failed/404 fetch just leaves `company` null, which
  // the render below turns into a "not found" message.
  useEffect(() => {
    companyService.careers(slug)
      .then(({ data }) => {
        setCompany(data.company);
        setJobs(data.jobs);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <Spinner />;
  if (!company) {
    return (
      <ScreenWrapper>
        <EmptyState title="Company not found" description="This career page doesn't exist." />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <FlatList
        data={jobs}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            {/* Company header */}
            <View style={styles.companyCard}>
              {company.logo ? (
                <Image source={{ uri: company.logo }} style={styles.companyLogo} resizeMode="contain" />
              ) : null}
              <Text style={styles.companyName}>{company.name}</Text>
              {company.description ? (
                <Text style={styles.companyDesc}>{company.description}</Text>
              ) : null}
              {company.website ? (
                <Text style={styles.companyWebsite}>{company.website.replace(/^https?:\/\//, '')}</Text>
              ) : null}
              {company.contact_email ? (
                <Text style={styles.companyContact}>{company.contact_email}</Text>
              ) : null}
            </View>
            <Text style={styles.sectionHeading}>Open Positions ({jobs.length})</Text>
          </View>
        }
        renderItem={({ item }) => <OpenJobCard job={item} />}
        ListEmptyComponent={
          <EmptyState title="No open positions right now" description="Check back soon!" />
        }
        // Small "browse other companies" excerpt from the static career
        // directory, below this one company's job listings — lets a job
        // seeker who isn't interested here discover other companies.
        ListFooterComponent={<CompanyDirectorySection mode="compact" />}
      />
    </ScreenWrapper>
  );
}

const makeStyles = (Colors: ThemeColors) => StyleSheet.create({
  list: { padding: Spacing[4] },
  companyCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[6],
    alignItems: 'center',
    marginBottom: Spacing[5],
  },
  companyLogo: { width: 64, height: 64, borderRadius: BorderRadius.md, marginBottom: Spacing[3] },
  companyName: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text, textAlign: 'center' },
  companyDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing[2] },
  companyWebsite: { fontSize: FontSize.sm, color: Colors.primary, marginTop: Spacing[3] },
  companyContact: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: Spacing[1] },
  sectionHeading: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text, marginBottom: Spacing[3] },
  jobCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[4],
    marginBottom: Spacing[3],
  },
  jobInfo: { flex: 1, marginRight: Spacing[3] },
  jobTitle: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.text },
  jobMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing[2] },
  jobMeta: { fontSize: FontSize.sm, color: Colors.textSecondary },
  jobMetaDot: { fontSize: FontSize.sm, color: Colors.textMuted },
  jobSalary: { fontSize: FontSize.sm, color: Colors.success, fontWeight: FontWeight.medium, marginTop: 4 },
  applyButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
  },
  applyButtonText: { color: Colors.white, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
});
