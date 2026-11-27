/**
 * HomeScreen.tsx
 *
 * Root screen of the "Jobs" bottom tab: a persistent segmented row
 * (Jobs / Govt Jobs / Companies) with the matching content rendered
 * inline below it — switching segments changes local state only, it
 * never navigates away, so the row (and which segment is highlighted)
 * stays constant no matter which of the three is active.
 *
 * - Jobs: one block — the search box, the "Hiring on StepsDoor" companies row
 *   (`HiringCompaniesRow`, narrowed by the same search text, hidden when empty)
 *   and the job list — the same layout as the web Jobs page. A company card
 *   opens StepsDoor's own branded careers page for it (`CompanyCareers`), not
 *   the company's external `website` field.
 * - Govt Jobs: members-only government openings.
 * - Companies: openings read from companies' careers pages
 *   (`CompanyOpeningsSection`) and the static career directory.
 *
 * Cards push `JobDetail` / `GovtJobDetail` / `CompanyCareers`, all registered
 * on this same `JobsStackNavigator`. Note: the "StepsDoor" / "Latest Jobs in India"
 * branding header lives on the Home tab now
 * (`screens/home/HomeTabScreen.tsx`), not here. The Jobs segment's search
 * box shares jobStore's `filters.search` state with that Home tab search
 * box (see `useJobs`) — typing in either updates the same search text.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, ScrollView, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useJobs } from '@/hooks/useJobs';
import { govtJobService } from '@/services/govtJobService';
import { JobCard } from '@/components/jobs/JobCard';
import { Spinner } from '@/components/common/Spinner';
import { EmptyState } from '@/components/common/EmptyState';
import { Badge } from '@/components/common/Badge';
import { ScreenWrapper } from '@/components/common/ScreenWrapper';
import { MembersOnly } from '@/components/common/MembersOnly';
import { useAuth } from '@/hooks/useAuth';
import { CompanyDirectorySection } from '@/components/companies/CompanyDirectorySection';
import { CompanyOpeningsSection } from '@/components/companies/CompanyOpeningsSection';
import { HiringCompaniesRow } from '@/components/companies/HiringCompaniesRow';
import { SaveJobButton } from '@/components/jobs/SaveJobButton';
import { useSavedJobs } from '@/hooks/useSavedJobs';
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

// Card renderer for the Govt Jobs segment. Formats the deadline and
// flags jobs expiring within 3 days so the list can highlight urgency —
// mirrors the card that used to live in the standalone GovtJobsScreen.
// `save` ({ saved, pending, onToggle }) adds a bookmark toggle; omitted for guests/company accounts.
function GovtJobCard({ job, onPress, save }: {
  job: GovtJob;
  onPress: () => void;
  save?: { saved: boolean; pending?: boolean; onToggle: () => void } | null;
}) {
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
      <View style={styles.govtHeader}>
        <Text style={styles.govtTitle} numberOfLines={2}>{job.title}</Text>
        {save && <SaveJobButton {...save} />}
      </View>
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

/**
 * Renders the segmented row plus whichever of Jobs/Govt Jobs/Companies is
 * active. Optional route param `segment` ('jobs' | 'govtJobs' | 'companies')
 * picks the starting segment (used by push-notification taps); `navigation` is used to push
 * `JobDetail`/`GovtJobDetail` on a card tap. Use case: default landing
 * view of the Jobs tab, giving a job seeker a persistent way to switch
 * between browsing private listings, government jobs, and companies
 * without those feeling like separate destinations.
 */
export function HomeScreen({ navigation, route }: { navigation: any; route?: any }) {
  const [segment, setSegment] = useState<Segment>('jobs');
  // A push-notification tap can open this screen on a given segment
  // (route param `segment`, see services/notificationRouting.ts). Applied on
  // each new navigation, then the user's own segment taps take over.
  const requestedSegment: Segment | undefined = route?.params?.segment;
  useEffect(() => {
    if (requestedSegment) setSegment(requestedSegment);
  }, [requestedSegment, route?.key, route?.params]);
  const Colors = useThemeColors();
  const styles = makeStyles(Colors);
  // Bookmark toggles on the StepsDoor and govt job cards (shared app-wide store).
  const { canSave, isSaved, isPending, toggleSave } = useSavedJobs();

  // Jobs — the default segment, so fetched immediately via the existing
  // hook. `filters`/`setFilters` are jobStore state shared with the Home
  // tab's own search box (see `HomeTabScreen`) — typing in either updates
  // the same underlying search text.
  const { jobs, loading: jobsLoading, filters, setFilters } = useJobs();

  // Govt Jobs — fetched (and refetched on search/filter change) only once
  // this segment is actually selected, since it's not the default view.
  // Members only: guests see a sign-in prompt and nothing is fetched; the
  // effect re-runs when they sign in (isAuthenticated is a dependency).
  const { isAuthenticated } = useAuth();
  const [govtJobs, setGovtJobs] = useState<GovtJob[]>([]);
  const [govtJobsLoading, setGovtJobsLoading] = useState(false);
  const [govtSearch, setGovtSearch] = useState('');
  const [govtState, setGovtState] = useState(''); // selected state filter; '' = all
  const [govtCategory, setGovtCategory] = useState(''); // selected category filter; '' = all
  const [govtStates, setGovtStates] = useState<FilterOption[]>([]); // distinct states with counts, for the picker
  const govtStatesFetchedRef = useRef(false);
  useEffect(() => {
    if (segment !== 'govtJobs' || !isAuthenticated) return;
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
  }, [segment, isAuthenticated, govtSearch, govtState, govtCategory]);

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
              placeholder="Search jobs or companies..."
              placeholderTextColor={Colors.textMuted}
              value={filters.search}
              onChangeText={(text) => setFilters({ search: text })}
            />
          </View>
          {/* The list stays mounted while jobs load (spinner in the empty slot), so the
              companies row in its header isn't remounted — and refetched — on every keystroke. */}
          <FlatList
            data={jobsLoading ? [] : jobs}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <JobCard
                job={item}
                onPress={() => navigation.navigate('JobDetail', { jobId: item.id })}
                save={canSave ? { saved: isSaved(item.id, 'job'), pending: isPending(item.id, 'job'), onToggle: () => toggleSave(item.id, 'job') } : null}
              />
            )}
            // Companies hiring on StepsDoor, in the same block as the jobs and
            // narrowed by the same search text; renders nothing when none match.
            ListHeaderComponent={
              <HiringCompaniesRow
                search={filters.search ?? ''}
                onOpen={(slug) => navigation.navigate('CompanyCareers', { slug })}
              />
            }
            ListEmptyComponent={
              jobsLoading ? <Spinner /> : <EmptyState title="No jobs found" description="Try a different search term." />
            }
          />
        </>
      )}

      {segment === 'govtJobs' && !isAuthenticated && (
        <MembersOnly what="the latest government job openings" />
      )}

      {segment === 'govtJobs' && isAuthenticated && (
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
                <GovtJobCard
                  job={item}
                  onPress={() => navigation.navigate('GovtJobDetail', { jobId: item.id })}
                  save={canSave ? { saved: isSaved(item.id, 'govt'), pending: isPending(item.id, 'govt'), onToggle: () => toggleSave(item.id, 'govt') } : null}
                />
              )}
              ListEmptyComponent={
                <EmptyState title="No government jobs found" description="Check back soon for new listings." />
              }
            />
          )}
        </>
      )}

      {segment === 'companies' && (
        // Openings read from companies' own careers pages (members only), then
        // the static career directory — the same order as the web Companies page.
        // Both render plain Views, so a ScrollView is enough here. Companies
        // hiring on StepsDoor are in the Jobs segment.
        <ScrollView contentContainerStyle={styles.list}>
          <CompanyOpeningsSection />
          <CompanyDirectorySection mode="full" />
        </ScrollView>
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
  govtHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing[2] },
  govtTitle: { flex: 1, fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.text },
  govtOrg: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 4 },
  govtState: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2 },
  govtFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing[3] },
  govtVacancies: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.medium },
  govtLastDate: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: Spacing[2] },
  govtLastDateUrgent: { color: Colors.error, fontWeight: FontWeight.semibold },
});
