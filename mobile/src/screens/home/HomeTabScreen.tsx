/**
 * HomeTabScreen.tsx
 *
 * Root screen of the "Home" bottom tab (and the app's launch screen — see
 * `initialRouteName="Home"` on `AppNavigator`'s Tab.Navigator). Owns the
 * "StepsDoor" / "Latest Jobs in India" branding header, a keyword search
 * bar (folded in from the former standalone "Search" tab — shares
 * `useJobs`/jobStore's filter state with the Jobs tab's own search box,
 * same as it always did), and — while not searching — a "What's New" feed
 * of recently *posted* content spanning Jobs and Shopping: the latest job
 * listings, the newest subscribed stores, and the newest special offers.
 * This is deliberately about newly-posted content, not the job seeker's
 * own browsing history (there is no view-tracking here).
 *
 * Signed-in job seekers also get their dashboard at the top of the feed
 * (`SeekerSummary`: Saved Jobs / Active Alerts / New Jobs Today cards and the
 * newest jobs matching their alerts), and contractors theirs (`ContractorSummary`:
 * New Today / Saved Tenders / Tender Alerts and the tenders matching their
 * alerts) — shown even when the feed is empty. Each renders nothing for other
 * accounts. Tender cards here have bookmark toggles.
 *
 * Unlike the old job-only search, typing here searches *every* browsable
 * section at once — Jobs (API), Tenders (API), and the static Shopping
 * directory (client-side filter of `ShoppingScreen`'s exported
 * `ALL_STORES`/`ALL_RETAIL_STORES` — both segments of that merged
 * Shopping tab) — rendered as three labeled result sections so a seeker
 * doesn't have to guess which tab a keyword belongs to.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, ScrollView, Image, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { jobService } from '@/services/jobService';
import { storeService } from '@/services/storeService';
import { tenderService } from '@/services/tenderService';
import { useJobs } from '@/hooks/useJobs';
import { useAuth } from '@/hooks/useAuth';
import { MembersOnly } from '@/components/common/MembersOnly';
import { SeekerSummary } from '@/components/home/SeekerSummary';
import { ContractorSummary } from '@/components/home/ContractorSummary';
import { useSavedTenders } from '@/hooks/useSavedTenders';
import { JobCard } from '@/components/jobs/JobCard';
import { TenderCard } from '@/components/tenders/TenderCard';
import { ALL_STORES, ALL_RETAIL_STORES, StoreEntry } from '@/screens/shopping/ShoppingScreen';
import { Spinner } from '@/components/common/Spinner';
import { EmptyState } from '@/components/common/EmptyState';
import { ScreenWrapper } from '@/components/common/ScreenWrapper';
import { useThemeColors, ThemeColors } from '@/theme/colors';
import { FontSize, FontWeight } from '@/theme/typography';
import { BorderRadius, Spacing } from '@/theme/spacing';

// Shape of a tender returned by `tenderService.list()` — matches
// `TenderCard`'s prop type.
interface TenderResult {
  id: number;
  title: string;
  organisation: string;
  state: string;
  category: string;
  estimated_value?: number;
  submission_deadline?: string;
}

// How many items each "What's New" section shows — a preview, not the
// full list (the Jobs tab and Shopping tab are where you browse everything).
const SECTION_LIMIT = 5;

// Shape of a job returned by `jobService.list()` — matches `JobCard`'s prop type.
interface LatestJob {
  id: number;
  title: string;
  company_name: string;
  city: string;
  job_type: string;
  salary_min?: number;
  salary_max?: number;
  created_at: string;
}

// Shape of a subscribed store returned by `storeService.list()` — only
// the fields this screen's compact card renders, plus `created_at` (used
// to sort newest-first client-side, since the backend list endpoint has
// no ordering param and defaults to alphabetical — see StoreCard below).
interface NewStore {
  id: number;
  name: string;
  logo?: string | null;
  tagline?: string;
  website_url: string;
  offers_links?: string;
  created_at: string;
}

// One parsed special-offer entry — either a subscribed store's own
// `offers_links` line, or a standalone admin-curated FeaturedLink.
interface OfferEntry {
  url: string;
  storeName: string;
  storeLogo?: string | null;
  storeId: number | string;
  description?: string;
}

/**
 * A compact tappable row for one newly-subscribed store — logo (or a
 * fallback icon), name, and tagline. Records a click via
 * `storeService.click` (for analytics, mirroring the Shopping tab) then
 * opens the store's site.
 *
 * @param store - The store to render (see `NewStore` interface above).
 */
function NewStoreCard({ store }: { store: NewStore }) {
  const Colors = useThemeColors();
  const styles = makeStyles(Colors);
  const onPress = async () => {
    try {
      const { data } = await storeService.click(store.id);
      const url = data.redirect_url || store.website_url;
      if (await Linking.canOpenURL(url)) await Linking.openURL(url);
    } catch {
      try {
        if (await Linking.canOpenURL(store.website_url)) await Linking.openURL(store.website_url);
      } catch { /* noop */ }
    }
  };

  return (
    <TouchableOpacity style={styles.previewCard} activeOpacity={0.75} onPress={onPress}>
      {store.logo ? (
        <Image source={{ uri: store.logo }} style={styles.previewLogo} resizeMode="cover" />
      ) : (
        <View style={styles.previewLogoFallback}>
          <Text style={styles.previewLogoFallbackIcon}>🛍️</Text>
        </View>
      )}
      <View style={styles.previewInfo}>
        <Text style={styles.previewTitle} numberOfLines={1}>{store.name}</Text>
        {store.tagline ? <Text style={styles.previewSubtitle} numberOfLines={1}>{store.tagline}</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

/**
 * A compact tappable row for one special offer — the store/link's logo
 * (or a fallback tag icon), its label, and description/host. Opens the
 * offer URL directly (offers aren't click-tracked the way store
 * homepages are).
 *
 * @param offer - The offer to render (see `OfferEntry` interface above).
 */
function OfferCard({ offer }: { offer: OfferEntry }) {
  const Colors = useThemeColors();
  const styles = makeStyles(Colors);
  const onPress = async () => {
    try {
      if (await Linking.canOpenURL(offer.url)) await Linking.openURL(offer.url);
    } catch { /* noop */ }
  };
  // Derive a readable host label (e.g. "www.amazon.in" -> "amazon.in") as
  // a fallback subtitle when the offer has no description.
  let hostLabel = offer.url;
  try {
    hostLabel = new URL(offer.url).hostname.replace(/^www\./, '');
  } catch { /* keep raw url */ }

  return (
    <TouchableOpacity style={styles.previewCard} activeOpacity={0.75} onPress={onPress}>
      {offer.storeLogo ? (
        <Image source={{ uri: offer.storeLogo }} style={styles.previewLogo} resizeMode="cover" />
      ) : (
        <View style={styles.previewLogoFallback}>
          <Text style={styles.previewLogoFallbackIcon}>🏷️</Text>
        </View>
      )}
      <View style={styles.previewInfo}>
        <Text style={styles.previewTitle} numberOfLines={1}>{offer.storeName}</Text>
        <Text style={styles.previewSubtitle} numberOfLines={1}>{offer.description || hostLabel}</Text>
      </View>
    </TouchableOpacity>
  );
}

/**
 * A tappable row for one Shopping-directory search match — mirrors
 * `ShoppingScreen`'s own `StoreCard` styling, but reuses this file's
 * `previewCard` style set so it fits alongside the Jobs/Tenders result
 * rows. Opens the store's URL directly (static directory entries aren't
 * click-tracked, matching `ShoppingScreen`'s behavior for the same data).
 *
 * @param store - The matched `StoreEntry`, augmented with its category label.
 */
function StoreResultCard({ store }: { store: StoreEntry & { groupLabel: string } }) {
  const Colors = useThemeColors();
  const styles = makeStyles(Colors);
  const openUrl = async () => {
    try {
      if (await Linking.canOpenURL(store.url)) await Linking.openURL(store.url);
    } catch { /* noop */ }
  };

  return (
    <TouchableOpacity style={styles.previewCard} activeOpacity={0.75} onPress={openUrl}>
      <View style={styles.previewLogoFallback}>
        <Text style={styles.previewLogoFallbackIcon}>🛍️</Text>
      </View>
      <View style={styles.previewInfo}>
        <Text style={styles.previewTitle} numberOfLines={1}>{store.name}</Text>
        <Text style={styles.previewSubtitle} numberOfLines={1}>{store.groupLabel}</Text>
      </View>
    </TouchableOpacity>
  );
}

/**
 * Renders the Home tab: branded header, search bar, then either combined
 * cross-section search results (search box non-empty — Jobs, Tenders, and
 * Shopping, each its own labeled section) or a "What's New" feed of
 * recently posted jobs/stores/offers (search box empty). Reads no route
 * params; `navigation` is used to push `JobDetailScreen`/`TenderDetail` on
 * their respective tabs, for both search result taps and "Latest Jobs"
 * preview taps. Use case: default landing view of the Home tab (and the
 * app's launch screen), letting a job seeker search everything at once or
 * see what's newly posted across the app.
 */
export function HomeTabScreen() {
  const navigation = useNavigation<any>();
  // Shares jobStore's filter state with the Jobs tab's own search box —
  // typing here (or there) updates the same `search` filter both read.
  // This same text drives the Tenders and Shopping searches below too, so
  // one search box covers every section.
  const { jobs: jobResults, loading: jobsSearchLoading, filters, setFilters } = useJobs();
  const isSearching = filters.search.trim().length > 0;
  const Colors = useThemeColors();
  const styles = makeStyles(Colors);

  // Contractor accounts see a tender-focused dashboard (new tenders feed)
  // instead of the default jobs/stores/offers feed.
  const { user, isAuthenticated } = useAuth();
  const isContractor = !!user?.is_contractor;
  // Bookmark toggles on tender cards (search results and the contractor feed).
  const savedTenders = useSavedTenders();
  const tenderSave = (id: number) => (savedTenders.canSave
    ? { saved: savedTenders.isSaved(id), pending: savedTenders.isPending(id), onToggle: () => savedTenders.toggleSave(id) }
    : null);

  // Tender search results — fetched from the API whenever the shared
  // search text changes and is non-empty (mirrors TendersScreen's own
  // `?search=` fetch), independent of jobStore since tenders have no
  // shared store of their own. Members only: guests get an inline sign-in
  // prompt in the results instead of a request (the API 401s them).
  const [tenderResults, setTenderResults] = useState<TenderResult[]>([]);
  const [tendersSearchLoading, setTendersSearchLoading] = useState(false);
  useEffect(() => {
    if (!isSearching || !isAuthenticated) { setTenderResults([]); return; }
    setTendersSearchLoading(true);
    tenderService
      .list({ search: filters.search })
      .then(({ data }) => setTenderResults(data.results ?? data))
      .catch(() => setTenderResults([]))
      .finally(() => setTendersSearchLoading(false));
  }, [isSearching, isAuthenticated, filters.search]);

  // Shopping matches — the static directory (`ALL_STORES`, from
  // ShoppingScreen, both the "Online Stores" and "Retail Chains" segments)
  // is small and already in memory, so this is a plain client-side filter
  // rather than an API call.
  const shoppingResults = useMemo(() => {
    if (!isSearching) return [];
    const q = filters.search.trim().toLowerCase();
    const matches = (s: StoreEntry & { groupLabel: string }) =>
      s.name.toLowerCase().includes(q) ||
      s.desc.toLowerCase().includes(q) ||
      s.groupLabel.toLowerCase().includes(q);
    return [...ALL_STORES.filter(matches), ...ALL_RETAIL_STORES.filter(matches)];
  }, [isSearching, filters.search]);

  // "What's New" feed state — fetched on mount (or when the user's role
  // changes), independent of the shared jobStore filters above.
  const [latestJobs, setLatestJobs] = useState<LatestJob[]>([]);
  const [newStores, setNewStores] = useState<NewStore[]>([]);
  const [offers, setOffers] = useState<OfferEntry[]>([]);
  // Contractor-specific feed: newest tenders, shown instead of jobs/stores/offers.
  const [latestTenders, setLatestTenders] = useState<TenderResult[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);

  useEffect(() => {
    if (isContractor) {
      // Contractors only care about new tenders — skip jobs/stores/offers.
      // Tender list defaults to newest-first (`-created_at`) on the backend.
      tenderService
        .list()
        .then(({ data }) => setLatestTenders((data.results ?? data).slice(0, SECTION_LIMIT)))
        .catch(() => setLatestTenders([]))
        .finally(() => setFeedLoading(false));
    } else {
      Promise.all([
        // JobPost's default ordering is `-created_at` (newest first), so no
        // extra query params are needed here.
        jobService.list().then(({ data }) => (data.results ?? data).slice(0, SECTION_LIMIT)).catch(() => []),
        // Store's default ordering is alphabetical by name, and the list
        // endpoint has no ordering query param — so fetch and sort
        // client-side by `created_at` (present in the response) instead.
        storeService.list().then(({ data }) => data.results ?? data).catch(() => []),
        storeService.listFeaturedLinks({ type: 'offer' }).then(({ data }) => data.results ?? data).catch(() => []),
      ]).then(([jobsData, storesData, featuredLinksData]) => {
        setLatestJobs(jobsData);

        const sortedStores: NewStore[] = [...storesData].sort(
          (a: NewStore, b: NewStore) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setNewStores(sortedStores.slice(0, SECTION_LIMIT));

        // Offers come from two sources, same as the Shopping tab's Special
        // Offers modal: each subscribed store's own `offers_links` field
        // (newline-separated URLs), plus standalone admin-curated
        // FeaturedLink entries. FeaturedLink entries are already
        // newest-first from the backend; store-derived ones have no
        // reliable order, so they're appended after.
        const storeOffers: OfferEntry[] = storesData.flatMap((store: NewStore) => {
          if (!store.offers_links) return [];
          return store.offers_links
            .split('\n')
            .map((line: string) => line.trim())
            .filter(Boolean)
            .map((url: string) => ({ url, storeName: store.name, storeLogo: store.logo, storeId: store.id }));
        });
        const featuredOffers: OfferEntry[] = featuredLinksData.map((fl: any) => ({
          url: fl.url, storeName: fl.label, storeLogo: fl.logo, storeId: fl.id, description: fl.description || '',
        }));
        setOffers([...featuredOffers, ...storeOffers].slice(0, SECTION_LIMIT));
      }).finally(() => setFeedLoading(false));
    }
  }, [isContractor]);

  // Job entries (search results or "Latest Jobs" preview) jump to
  // JobDetailScreen on the Jobs tab — a sibling tab on this same
  // Tab.Navigator, so navigating by name with nested params both
  // switches tabs and pushes the detail screen.
  const openJob = (jobId: number) => {
    navigation.navigate('Jobs', { screen: 'JobDetail', params: { jobId } });
  };

  // Tender results jump to TenderDetailScreen on the Tenders tab, same
  // cross-tab navigation pattern as openJob above.
  const openTender = (tenderId: number) => {
    navigation.navigate('Tenders', { screen: 'TenderDetail', params: { tenderId } });
  };

  // For contractors the feed is tenders-only; for everyone else it's jobs/stores/offers.
  const hasFeedContent = isContractor
    ? latestTenders.length > 0
    : latestJobs.length > 0 || newStores.length > 0 || offers.length > 0;
  const searchLoading = jobsSearchLoading || tendersSearchLoading;
  const hasSearchResults = jobResults.length > 0 || tenderResults.length > 0 || shoppingResults.length > 0;

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <Text style={styles.greeting}>StepsDoor</Text>
        {/* Subtitle reflects the user's role — contractors see tender-focused copy */}
        <Text style={styles.subtitle}>
          {isContractor ? 'Latest Tenders in India' : 'Latest Jobs in India'}
        </Text>
      </View>

      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder={isContractor ? 'Search tenders, govt jobs...' : 'Search jobs, tenders, stores...'}
          placeholderTextColor={Colors.textMuted}
          value={filters.search}
          onChangeText={(text) => setFilters({ search: text })}
        />
      </View>

      {isSearching ? (
        // Guests always get the results list, which carries the tenders sign-in prompt —
        // otherwise a tenders-only match would just read "No results".
        searchLoading ? <Spinner /> : !hasSearchResults && isAuthenticated ? (
          <EmptyState title="No results" description="Try a different search term." />
        ) : (
          <ScrollView contentContainerStyle={styles.list}>
            {jobResults.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionHeading}>Jobs ({jobResults.length})</Text>
                {jobResults.map((job: any) => (
                  <JobCard key={job.id} job={job} onPress={() => openJob(job.id)} />
                ))}
              </View>
            )}
            {!isAuthenticated && (
              <View style={styles.section}>
                <Text style={styles.sectionHeading}>Tenders</Text>
                <MembersOnly compact what="matching government tenders" />
              </View>
            )}
            {tenderResults.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionHeading}>Tenders ({tenderResults.length})</Text>
                {tenderResults.map((tender) => (
                  <TenderCard key={tender.id} tender={tender} onPress={() => openTender(tender.id)} save={tenderSave(tender.id)} />
                ))}
              </View>
            )}
            {shoppingResults.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionHeading}>Shopping ({shoppingResults.length})</Text>
                {shoppingResults.map((store, index) => (
                  <StoreResultCard key={`${store.name}-${index}`} store={store} />
                ))}
              </View>
            )}
          </ScrollView>
        )
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {/* Dashboards (stat cards + listings matching their alerts): job seekers get
              SeekerSummary, contractors ContractorSummary. Above the feed and outside its
              loading/empty states, so they always show. */}
          <SeekerSummary />
          <ContractorSummary />
          {feedLoading ? (
            <Spinner />
          ) : !hasFeedContent ? (
            <EmptyState
              title="Nothing new yet"
              description={
                isContractor
                  ? 'Check back soon for new government tenders.'
                  : 'Check back soon for new jobs, stores, and offers.'
              }
            />
          ) : isContractor ? (
            // Contractor dashboard: show new tenders instead of jobs/stores/offers.
            latestTenders.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionHeading}>New Tenders</Text>
                {latestTenders.map((tender) => (
                  <TenderCard key={tender.id} tender={tender} onPress={() => openTender(tender.id)} save={tenderSave(tender.id)} />
                ))}
              </View>
            )
          ) : (
            <>
              {latestJobs.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionHeading}>Latest Jobs</Text>
                  {latestJobs.map((job) => (
                    <JobCard key={job.id} job={job} onPress={() => openJob(job.id)} />
                  ))}
                </View>
              )}
              {newStores.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionHeading}>New Stores</Text>
                  {newStores.map((store) => (
                    <NewStoreCard key={store.id} store={store} />
                  ))}
                </View>
              )}
              {offers.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionHeading}>Special Offers</Text>
                  {offers.map((offer, index) => (
                    <OfferCard key={`${offer.storeId}-${index}`} offer={offer} />
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}
    </ScreenWrapper>
  );
}

const makeStyles = (Colors: ThemeColors) => StyleSheet.create({
  header: { padding: Spacing[5], backgroundColor: Colors.primary },
  greeting: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.white },
  subtitle: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  searchBar: { padding: Spacing[4], backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
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
  list: { padding: Spacing[4] },
  section: { marginBottom: Spacing[5] },
  sectionHeading: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing[3],
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[3],
    marginBottom: Spacing[2],
  },
  previewLogo: { width: 40, height: 40, borderRadius: BorderRadius.md },
  previewLogoFallback: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewLogoFallbackIcon: { fontSize: 18 },
  previewInfo: { flex: 1, marginLeft: Spacing[3] },
  previewTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text },
  previewSubtitle: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
});
