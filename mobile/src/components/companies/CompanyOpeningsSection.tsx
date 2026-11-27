/**
 * components/companies/CompanyOpeningsSection.tsx
 *
 * "Latest openings from company careers pages" — members-only list of jobs read
 * from private companies' own ATS feeds (GET /api/careers/jobs/), with keyword
 * search, city and company filters, and "Show more" paging. Tapping a job opens it on the
 * company's own site, where the seeker applies.
 *
 * Rendered in the Jobs tab's Companies segment (`screens/jobs/HomeScreen.tsx`),
 * between the StepsDoor subscriber companies and the static career directory —
 * the same order as the web Companies page. Guests get the compact MembersOnly
 * prompt and no request is made (the API 401s anonymous calls). Rows are plain
 * Views (not a nested FlatList) because this lives inside the segment's FlatList.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { careerService } from '@/services/careerService';
import { useAuth } from '@/hooks/useAuth';
import { useSavedJobs } from '@/hooks/useSavedJobs';
import { SaveJobButton } from '@/components/jobs/SaveJobButton';
import { MembersOnly } from '@/components/common/MembersOnly';
import { Spinner } from '@/components/common/Spinner';
import { FilterPickerButton, FilterOption } from '@/components/common/FilterPickerButton';
import { useThemeColors, ThemeColors } from '@/theme/colors';
import { FontSize, FontWeight } from '@/theme/typography';
import { BorderRadius, Spacing } from '@/theme/spacing';

// One job as returned by CareerJobSerializer.
export interface CareerJob {
  id: number;
  title: string;
  company_name: string;
  location: string;
  cities: string[]; // standard city names found in `location` (may be empty)
  department: string;
  employment_type: string;
  apply_url: string; // the job on the company's ATS
  posted_at: string | null;
}

/** "Today" / "1 day ago" / "5 days ago" / "3 months ago" for a posting date. */
export function postedAgo(iso: string | null, now: Date = new Date()): string {
  if (!iso) return '';
  const days = Math.floor((now.getTime() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 60) return `${days} days ago`;
  return `${Math.floor(days / 30)} months ago`;
}

/**
 * One opening: title, company, location / team facts and posting age; tap opens the apply page.
 * `save` ({ saved, pending, onToggle }) adds a bookmark toggle; omitted for company accounts.
 */
function OpeningCard({ job, styles, Colors, save }: {
  job: CareerJob;
  styles: Styles;
  Colors: ThemeColors;
  save?: { saved: boolean; pending?: boolean; onToggle: () => void } | null;
}) {
  const facts = [job.department, job.employment_type].filter(Boolean).join(' · ');
  // Standard city names read better than raw ATS text (often an office address); fall back to the text.
  const place = job.cities?.length ? job.cities.join(', ') : job.location;
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={() => Linking.openURL(job.apply_url)}
      accessibilityRole="link" accessibilityLabel={`${job.title} at ${job.company_name}, apply on company site`}>
      <View style={styles.cardTop}>
        <Text style={styles.title} numberOfLines={2}>{job.title}</Text>
        {save ? <SaveJobButton {...save} /> : <Ionicons name="open-outline" size={16} color={Colors.textMuted} />}
      </View>
      <Text style={styles.company} numberOfLines={1}>{job.company_name}</Text>
      {place ? <Text style={styles.meta} numberOfLines={1}>{place}</Text> : null}
      {facts ? <Text style={styles.meta} numberOfLines={1}>{facts}</Text> : null}
      <View style={styles.cardBottom}>
        <Text style={styles.applyText}>Apply on company site</Text>
        {job.posted_at ? <Text style={styles.age}>{postedAgo(job.posted_at)}</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

/**
 * CompanyOpeningsSection
 *
 * Heading + filters + list. No props; reads the auth state to choose between
 * the list and the sign-in prompt, and loads once a token exists.
 */
export function CompanyOpeningsSection() {
  const Colors = useThemeColors();
  const styles = makeStyles(Colors);
  const { isAuthenticated } = useAuth();
  const { canSave, isSaved, isPending, toggleSave } = useSavedJobs(); // bookmark toggles on the cards
  const [searchInput, setSearchInput] = useState(''); // what's typed; applied after a pause
  const [search, setSearch] = useState('');           // applied keyword sent to the API
  const [company, setCompany] = useState('');         // CareerSource id, '' = all companies
  const [city, setCity] = useState('');               // standard city name, '' = all cities
  const [cities, setCities] = useState<FilterOption[]>([]); // city picker options with job counts
  const [companies, setCompanies] = useState<FilterOption[]>([]); // picker options with job counts
  const [jobs, setJobs] = useState<CareerJob[]>([]);  // all pages loaded so far
  const [count, setCount] = useState(0);              // total matching jobs
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);      // the API returned a `next` page
  const [loadedKey, setLoadedKey] = useState('');     // request key of the last response received
  const requestKey = `${search}|${city}|${company}|${page}`;  // what the list should currently show
  const loading = loadedKey !== requestKey;           // derived, so effects never set state synchronously

  // Apply the search box 400 ms after typing stops; a new keyword starts again from page 1.
  useEffect(() => {
    const timer = setTimeout(() => {
      const value = searchInput.trim();
      setSearch(prev => {
        if (prev !== value) setPage(1);
        return value;
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // A new city or company also starts again from page 1.
  const onSelectCity = (value: string) => { setCity(value); setPage(1); };
  const onSelectCompany = (value: string) => { setCompany(value); setPage(1); };

  // Company picker options (only companies with open jobs).
  useEffect(() => {
    if (!isAuthenticated) return;
    careerService.companies()
      .then(({ data }) => setCompanies(data.map((c: { id: number; company_name: string; job_count: number }) => ({
        value: String(c.id), label: c.company_name, count: c.job_count,
      }))))
      .catch(() => setCompanies([]));
  }, [isAuthenticated]);

  // City picker options (only cities with open jobs).
  useEffect(() => {
    if (!isAuthenticated) return;
    careerService.cities()
      .then(({ data }) => setCities(data.map((c: { city: string; count: number }) => ({
        value: c.city, label: c.city, count: c.count,
      }))))
      .catch(() => setCities([]));
  }, [isAuthenticated]);

  // Load the current page; page 1 replaces the list, later pages append ("Show more").
  // A response for a superseded request (filters changed meanwhile) is ignored.
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    careerService.list({ search: search || undefined, city: city || undefined, company: company || undefined, page })
      .then(({ data }) => {
        if (cancelled) return;
        setJobs(prev => (page === 1 ? data.results : [...prev, ...data.results]));
        setCount(data.count ?? data.results.length);
        setHasMore(Boolean(data.next));
      })
      .catch(() => { if (!cancelled && page === 1) { setJobs([]); setCount(0); setHasMore(false); } })
      .finally(() => { if (!cancelled) setLoadedKey(`${search}|${city}|${company}|${page}`); });
    return () => { cancelled = true; };
  }, [isAuthenticated, search, city, company, page]);

  const heading = (
    <View style={styles.heading}>
      <Text style={styles.headingTitle}>Latest openings from company careers pages</Text>
      <Text style={styles.headingText}>
        {"Jobs in India from companies' own careers sites, refreshed twice a day. You apply on the company's site."}
      </Text>
    </View>
  );

  if (!isAuthenticated) {
    return (
      <View style={styles.section}>
        {heading}
        <MembersOnly compact what="the latest openings at top companies" source="company careers pages" />
      </View>
    );
  }

  return (
    <View style={styles.section}>
      {heading}
      <TextInput
        style={styles.searchInput}
        placeholder="Search role, company or city..."
        placeholderTextColor={Colors.textMuted}
        value={searchInput}
        onChangeText={setSearchInput}
      />
      <View style={styles.filterRow}>
        <FilterPickerButton
          icon="location-outline"
          modalTitle="Filter by City"
          allLabel="All Cities"
          options={cities}
          selectedValue={city}
          onSelect={onSelectCity}
        />
        <FilterPickerButton
          icon="business-outline"
          modalTitle="Filter by Company"
          allLabel="All Companies"
          options={companies}
          selectedValue={company}
          onSelect={onSelectCompany}
        />
      </View>

      {loading && page === 1 ? <Spinner /> : jobs.length === 0 ? (
        <Text style={styles.empty}>
          {search || city || company ? 'No openings match. Try a different keyword, city or company.' : 'Openings appear here after the next refresh.'}
        </Text>
      ) : (
        <>
          <Text style={styles.count}>{count.toLocaleString('en-IN')} opening{count === 1 ? '' : 's'}</Text>
          {jobs.map(job => (
            <OpeningCard
              key={job.id}
              job={job}
              styles={styles}
              Colors={Colors}
              save={canSave ? { saved: isSaved(job.id, 'company'), pending: isPending(job.id, 'company'), onToggle: () => toggleSave(job.id, 'company') } : null}
            />
          ))}
          {hasMore && (
            <TouchableOpacity style={styles.moreButton} onPress={() => setPage(p => p + 1)} disabled={loading}>
              <Text style={styles.moreText}>{loading ? 'Loading...' : 'Show more'}</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (Colors: ThemeColors) => StyleSheet.create({
  section: { marginTop: Spacing[4], marginBottom: Spacing[6] },
  heading: { marginBottom: Spacing[3] },
  headingTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  headingText: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: Spacing[1] },
  searchInput: {
    height: 44,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing[4],
    fontSize: FontSize.base,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterRow: { flexDirection: 'row', gap: Spacing[2], marginTop: Spacing[2], marginBottom: Spacing[3] },
  count: { fontSize: FontSize.xs, color: Colors.textSecondary, marginBottom: Spacing[2] },
  empty: { fontSize: FontSize.sm, color: Colors.textSecondary, paddingVertical: Spacing[6], textAlign: 'center' },
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing[3],
    marginBottom: Spacing[2],
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing[2] },
  title: { flex: 1, fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.text },
  company: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.textSecondary, marginTop: 2 },
  meta: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing[2] },
  applyText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.primary },
  age: { fontSize: FontSize.xs, color: Colors.textMuted },
  moreButton: {
    alignItems: 'center',
    paddingVertical: Spacing[3],
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
  },
  moreText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.primary },
});
