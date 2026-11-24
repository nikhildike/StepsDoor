/**
 * TendersScreen.tsx
 *
 * List screen for the "Tenders" bottom tab: a searchable, filterable feed
 * of government tender listings — search box plus "All States" (fetched
 * from `GET /tenders/states/`, since `Tender.state` is free-text scraped
 * data) and "All Categories" (hardcoded, mirroring the backend's fixed
 * `TenderCategory` enum) picker buttons. Root screen of that tab's stack
 * navigator; navigates to `TenderDetailScreen` on card tap. Members only:
 * guests see a `MembersOnly` sign-in prompt and no API calls are made.
 */
import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View, TextInput } from 'react-native';
import { tenderService } from '@/services/tenderService';
import { TenderCard } from '@/components/tenders/TenderCard';
import { FilterPickerButton, FilterOption } from '@/components/common/FilterPickerButton';
import { Spinner } from '@/components/common/Spinner';
import { EmptyState } from '@/components/common/EmptyState';
import { ScreenWrapper } from '@/components/common/ScreenWrapper';
import { MembersOnly } from '@/components/common/MembersOnly';
import { useAuth } from '@/hooks/useAuth';
import { useThemeColors, ThemeColors } from '@/theme/colors';
import { FontSize } from '@/theme/typography';
import { BorderRadius, Spacing } from '@/theme/spacing';

interface Tender {
  id: number;
  title: string;
  organisation: string;
  state: string;
  category: string;
  estimated_value?: number;
  submission_deadline?: string;
}

// Category value -> display label, mirrors backend `apps.tenders.models.TenderCategory`
// (a fixed enum, unlike `state` which is free-text scraped data — see the
// "All States" picker below, populated from the API instead).
const TENDER_CATEGORIES: FilterOption[] = [
  { value: 'civil', label: 'Civil Works' },
  { value: 'it', label: 'IT & Software' },
  { value: 'supply', label: 'Supply of Goods' },
  { value: 'transport', label: 'Transport' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'education', label: 'Education' },
  { value: 'defence', label: 'Defence' },
  { value: 'power', label: 'Power & Energy' },
  { value: 'other', label: 'Other' },
];

/**
 * Renders a searchable, filterable list of government tenders. Reads no
 * route params; `navigation` is used to push `TenderDetailScreen` with the
 * tapped tender's id. Use case: primary browse/search entry point for the
 * "Tenders" tab, letting a job seeker filter by keyword, state, or
 * category and drill into a tender's full details.
 */
export function TendersScreen({ navigation }: { navigation: any }) {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [state, setState] = useState(''); // selected state filter; '' = all
  const [category, setCategory] = useState(''); // selected category filter; '' = all
  const [states, setStates] = useState<FilterOption[]>([]); // distinct states with counts, for the picker
  const Colors = useThemeColors();
  const styles = makeStyles(Colors);
  // Scraped tenders are members-only (the API 401s guests); fetches below wait for a
  // token and re-run when the user signs in from the prompt.
  const { isAuthenticated } = useAuth();

  // Fetches the distinct-states list once signed in to populate the "All
  // States" picker (see `tenderService.states()` — curated against a known
  // portal->state map so scraped junk values don't show up as options).
  useEffect(() => {
    if (!isAuthenticated) return;
    tenderService
      .states()
      .then(({ data }) => setStates(data.map((row: { state: string; count: number }) => ({
        value: row.state, label: row.state, count: row.count,
      }))))
      .catch(() => setStates([]));
  }, [isAuthenticated]);

  // Fetches tenders from GET /tenders/?search=...&state=...&category=...
  // whenever any filter changes (including the initial empty-filter load).
  // Falls back to an empty list on error so the EmptyState renders instead
  // of crashing.
  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    tenderService
      .list({ search, state: state || undefined, category: category || undefined })
      .then(({ data }) => setTenders(data.results ?? data))
      .catch(() => setTenders([]))
      .finally(() => setLoading(false));
  }, [isAuthenticated, search, state, category]);

  if (!isAuthenticated) {
    return (
      <ScreenWrapper>
        <MembersOnly what="the latest government tenders" />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          placeholder="Search tenders..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        <View style={styles.filterRow}>
          <FilterPickerButton
            icon="location-outline"
            modalTitle="Filter by State"
            allLabel="All States"
            options={states}
            selectedValue={state}
            onSelect={setState}
          />
          <FilterPickerButton
            icon="pricetag-outline"
            modalTitle="Filter by Category"
            allLabel="All Categories"
            options={TENDER_CATEGORIES}
            selectedValue={category}
            onSelect={setCategory}
          />
        </View>
      </View>
      {/* Loading state: spinner while the initial/search fetch is in flight */}
      {loading ? (
        <Spinner />
      ) : (
        <FlatList
          data={tenders}
          // Stable string key per tender id
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TenderCard
              tender={item}
              // List item press: navigate to TenderDetailScreen with the
              // tapped tender's id as a route param
              onPress={() => navigation.navigate('TenderDetail', { tenderId: item.id })}
            />
          )}
          // Empty state shown when the search/fetch returns no results
          ListEmptyComponent={
            <EmptyState
              title="No tenders found"
              description="Check back soon for new government tenders."
            />
          }
        />
      )}
    </ScreenWrapper>
  );
}

const makeStyles = (Colors: ThemeColors) => StyleSheet.create({
  searchBar: { padding: Spacing[4], backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: Spacing[2] },
  input: {
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
  list: { padding: Spacing[4] },
});
