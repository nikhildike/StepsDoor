/**
 * HomeScreen.tsx
 *
 * Root screen of the "Jobs" bottom tab: a persistent segmented row
 * (Jobs / Govt Jobs / Companies) with the matching content rendered
 * inline below it — switching segments changes local state only, it
 * never navigates away, so the row (and which segment is highlighted)
 * stays constant no matter which of the three is active. Job/Govt Job/
 * Company cards all push their respective detail screens
 * (`JobDetail`/`GovtJobDetail`/`CompanyCareers`, all registered on this
 * same `JobsStackNavigator`) — a company card links to StepsDoor's own
 * branded careers page for that company, not the company's external
 * `website` field (often unset, and not guaranteed to be a careers page
 * even when it is). Note: the "StepsDoor" / "Latest Jobs in India"
 * branding header lives on the Home tab now
 * (`screens/home/HomeTabScreen.tsx`), not here. The Jobs segment's search
 * box shares jobStore's `filters.search` state with that Home tab search
 * box (see `useJobs`) — typing in either updates the same search text.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useJobs } from '@/hooks/useJobs';
import { govtJobService } from '@/services/govtJobService';
import { companyService } from '@/services/companyService';
import { JobCard } from '@/components/jobs/JobCard';
import { Spinner } from '@/components/common/Spinner';
import { EmptyState } from '@/components/common/EmptyState';
import { Badge } from '@/components/common/Badge';
import { ScreenWrapper } from '@/components/common/ScreenWrapper';
import { CompanyDirectorySection } from '@/components/companies/CompanyDirectorySection';
import { FilterPickerButton, FilterOption } from '@/components/common/FilterPickerButton';
import { useThemeColors, ThemeColors } from '@/theme/colors';
import { FontSize, FontWeight } from '@/theme/typography';
import { BorderRadius, Spacing } from '@/theme/spacing';

type Segment = 'jobs' | 'govtJobs' | 'companies';

const SEGMENTS: { key: Segment; label: string; icon: string }[] = [
  { key: 'jobs', label: 'Jobs', icon: 'briefcase-outline' },
  { key: 'govtJobs', label: 'Govt Jobs', icon: 'school-outline' },
  { key: 'companies', label: 'Companies', icon: 'business-outline' },
];

// Category value -> display label, mirrors backend `apps.govtjobs.models.GovtJobCategory`
// (a fixed enum, unlike `state` which is free-text scraped data — see the
// Govt Jobs segment's "All States" picker, populated from the API instead).
const GOVT_JOB_CATEGORIES: FilterOption[] = [
  { value: 'civil_services', label: 'Civil Services' },
  { value: 'banking', label: 'Banking' },
  { value: 'railway', label: 'Railway' },
  { value: 'police', label: 'Police' },
  { value: 'teaching', label: 'Teaching' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'psu', label: 'PSU' },
  { value: 'state_govt', label: 'State Govt' },
  { value: 'other', label: 'Other' },
];

interface GovtJob {
  id: number;
  title: string;
  organisation: string;
  state: string;
  category: string;
  vacancies?: number;
  last_date?: string;
}

interface Company {
  id: number;
  name: string;
  slug: string;
  logo?: string | null;
  description?: string;
  website?: string;
  active_job_count: number;
}

// Card renderer for the Govt Jobs segment. Formats the deadline and
// flags jobs expiring within 3 days so the list can highlight urgency —
// mirrors the card that used to live in the standalone GovtJobsScreen.
function GovtJobCard({ job, onPress }: { job: GovtJob; onPress: () => void }) {
  const Colors = useThemeColors();
  const styles = makeStyles(Colors);
  const lastDate = job.last_date
    ? new Date(job.last_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;
  const isExpiringSoon = job.last_date
    ? (new Date(job.last_date).getTime() - Date.now()) < 3 * 86400000
    : false;

  return (
    <TouchableOpacity style={styles.govtCard} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.govtTitle} numberOfLines={2}>{job.title}</Text>
      <Text style={styles.govtOrg}>{job.organisation}</Text>
      <Text style={styles.govtState}>{job.state}</Text>
      <View style={styles.govtFooter}>
        <Badge label={job.category} />
        {job.vacancies && <Text style={styles.govtVacancies}>{job.vacancies} vacancies</Text>}
      </View>
      {lastDate && (
        <Text style={[styles.govtLastDate, isExpiringSoon && styles.govtLastDateUrgent]}>
          Last date: {lastDate}
        </Text>
      )}
    </TouchableOpacity>
  );
}

// Card renderer for the Companies segment — pushes CompanyCareersScreen
// (StepsDoor's own hosted careers page for this company), not the
// company's external website field.
function CompanyCard({ company, onPress }: { company: Company; onPress: () => void }) {
  const Colors = useThemeColors();
  const styles = makeStyles(Colors);

  return (
    <TouchableOpacity style={styles.companyCard} activeOpacity={0.75} onPress={onPress}>
      {company.logo ? (
        <Image source={{ uri: company.logo }} style={styles.companyLogo} resizeMode="cover" />
      ) : (
        <View style={styles.companyLogoFallback}>
          <Text style={styles.companyLogoFallbackIcon}>🏢</Text>
        </View>
      )}
      <View style={styles.companyInfo}>
        <Text style={styles.companyName} numberOfLines={1}>{company.name}</Text>
        {company.description ? (
          <Text style={styles.companyDesc} numberOfLines={2}>{company.description}</Text>
        ) : null}
        <Text style={styles.companyJobCount}>
          {company.active_job_count} open position{company.active_job_count !== 1 ? 's' : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

/**
 * Renders the segmented row plus whichever of Jobs/Govt Jobs/Companies is
 * active. Reads no route params; `navigation` is used to push
 * `JobDetail`/`GovtJobDetail` on a card tap. Use case: default landing
 * view of the Jobs tab, giving a job seeker a persistent way to switch
 * between browsing private listings, government jobs, and companies
 * without those feeling like separate destinations.
 */
export function HomeScreen({ navigation }: { navigation: any }) {
  const [segment, setSegment] = useState<Segment>('jobs');
  const Colors = useThemeColors();
  const styles = makeStyles(Colors);

  // Jobs — the default segment, so fetched immediately via the existing
  // hook. `filters`/`setFilters` are jobStore state shared with the Home
  // tab's own search box (see `HomeTabScreen`) — typing in either updates
  // the same underlying search text.
  const { jobs, loading: jobsLoading, filters, setFilters } = useJobs();

  // Govt Jobs — fetched (and refetched on search/filter change) only once
  // this segment is actually selected, since it's not the default view.
  const [govtJobs, setGovtJobs] = useState<GovtJob[]>([]);
  const [govtJobsLoading, setGovtJobsLoading] = useState(false);
  const [govtSearch, setGovtSearch] = useState('');
  const [govtState, setGovtState] = useState(''); // selected state filter; '' = all
  const [govtCategory, setGovtCategory] = useState(''); // selected category filter; '' = all
  const [govtStates, setGovtStates] = useState<FilterOption[]>([]); // distinct states with counts, for the picker
  const govtStatesFetchedRef = useRef(false);
  useEffect(() => {
    if (segment !== 'govtJobs') return;
    // Distinct-states list only needs fetching once — it's not
    // search/filter-dependent, unlike the job list below.
    if (!govtStatesFetchedRef.current) {
      govtStatesFetchedRef.current = true;
      govtJobService
        .states()
        .then(({ data }) => setGovtStates(data.map((row: { state: string; count: number }) => ({
          value: row.state, label: row.state, count: row.count,
        }))))
        .catch(() => setGovtStates([]));
    }
    setGovtJobsLoading(true);
    govtJobService
      .list({ search: govtSearch, state: govtState || undefined, category: govtCategory || undefined })
      .then(({ data }) => setGovtJobs(data.results ?? data))
      .catch(() => setGovtJobs([]))
      .finally(() => setGovtJobsLoading(false));
  }, [segment, govtSearch, govtState, govtCategory]);

  // Companies — fetched once, the first time this segment is selected
  // (a static subscriber list doesn't need refetching on every switch).
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const companiesFetchedRef = useRef(false);
  useEffect(() => {
    if (segment !== 'companies' || companiesFetchedRef.current) return;
    companiesFetchedRef.current = true;
    setCompaniesLoading(true);
    companyService
      .list()
      .then(({ data }) => setCompanies(data.results ?? data))
      .catch(() => {})
      .finally(() => setCompaniesLoading(false));
  }, [segment]);

  return (
    <ScreenWrapper>
      {/* Segmented row — always rendered, regardless of which segment is
          active, so switching between Jobs/Govt Jobs/Companies never
          feels like leaving this screen. */}
      <View style={styles.segmentedRow}>
        {SEGMENTS.map((s) => {
          const isActive = segment === s.key;
          return (
            <TouchableOpacity
              key={s.key}
              style={[styles.segment, isActive && styles.segmentActive]}
              onPress={() => setSegment(s.key)}
              activeOpacity={0.75}
            >
              <Ionicons name={s.icon as any} size={16} color={isActive ? Colors.white : Colors.primary} />
              <Text style={[styles.segmentLabel, isActive && styles.segmentLabelActive]}>{s.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {segment === 'jobs' && (
        <>
          <View style={styles.searchBar}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search jobs..."
              placeholderTextColor={Colors.textMuted}
              value={filters.search}
              onChangeText={(text) => setFilters({ search: text })}
            />
          </View>
          {jobsLoading ? <Spinner /> : (
            <FlatList
              data={jobs}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => (
                <JobCard job={item} onPress={() => navigation.navigate('JobDetail', { jobId: item.id })} />
              )}
              ListEmptyComponent={<EmptyState title="No jobs found" description="Try a different search term." />}
            />
          )}
        </>
      )}

      {segment === 'govtJobs' && (
        <>
          <View style={styles.searchBar}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search government jobs..."
              placeholderTextColor={Colors.textMuted}
              value={govtSearch}
              onChangeText={setGovtSearch}
            />
            <View style={styles.filterRow}>
              <FilterPickerButton
                icon="location-outline"
                modalTitle="Filter by State"
                allLabel="All States"
                options={govtStates}
                selectedValue={govtState}
                onSelect={setGovtState}
              />
              <FilterPickerButton
                icon="pricetag-outline"
                modalTitle="Filter by Category"
                allLabel="All Categories"
                options={GOVT_JOB_CATEGORIES}
                selectedValue={govtCategory}
                onSelect={setGovtCategory}
              />
            </View>
          </View>
          {govtJobsLoading ? <Spinner /> : (
            <FlatList
              data={govtJobs}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => (
                <GovtJobCard job={item} onPress={() => navigation.navigate('GovtJobDetail', { jobId: item.id })} />
              )}
              ListEmptyComponent={
                <EmptyState title="No government jobs found" description="Check back soon for new listings." />
              }
            />
          )}
        </>
      )}

      {segment === 'companies' && (
        companiesLoading ? <Spinner /> : (
          <FlatList
            data={companies}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <CompanyCard company={item} onPress={() => navigation.navigate('CompanyCareers', { slug: item.slug })} />
            )}
            ListEmptyComponent={
              <EmptyState title="No companies yet" description="Check back soon for companies hiring on StepsDoor." />
            }
            // Static career directory (300+ external companies, sector
            // filter + search) rendered below the subscriber list, mirroring
            // the bottom section of the web app's Companies page.
            ListFooterComponent={<CompanyDirectorySection mode="full" />}
          />
        )
      )}
    </ScreenWrapper>
  );
}

const makeStyles = (Colors: ThemeColors) => StyleSheet.create({
  segmentedRow: {
    flexDirection: 'row',
    gap: Spacing[2],
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing[2],
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  segmentActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  segmentLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.primary },
  segmentLabelActive: { color: Colors.white },
  list: { padding: Spacing[4] },

  // Govt Jobs segment (searchBar/searchInput also reused by the Jobs
  // segment's own search box, which has no filter row so `gap` is unused there)
  searchBar: { padding: Spacing[4], backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: Spacing[2] },
  searchInput: {
    height: 44,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing[4],
    fontSize: FontSize.base,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterRow: { flexDirection: 'row', gap: Spacing[2] },
  govtCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing[4],
    marginBottom: Spacing[3],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  govtTitle: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.text },
  govtOrg: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 4 },
  govtState: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2 },
  govtFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing[3] },
  govtVacancies: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.medium },
  govtLastDate: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: Spacing[2] },
  govtLastDateUrgent: { color: Colors.error, fontWeight: FontWeight.semibold },

  // Companies segment
  companyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[3],
    marginBottom: Spacing[2],
  },
  companyLogo: { width: 48, height: 48, borderRadius: BorderRadius.md },
  companyLogoFallback: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  companyLogoFallbackIcon: { fontSize: 22 },
  companyInfo: { flex: 1, marginLeft: Spacing[3] },
  companyName: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text },
  companyDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  companyJobCount: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: Colors.primary, marginTop: 4 },
});
