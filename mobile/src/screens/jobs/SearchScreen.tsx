/**
 * SearchScreen.tsx
 *
 * Root screen of the "Search" bottom tab: a keyword search over private job
 * listings, sharing the same `useJobs`/jobStore filter state as the Jobs
 * tab. Root of that tab's stack navigator; navigates to `JobDetailScreen`
 * on card tap.
 */
import React from 'react';
import { View, TextInput, FlatList, StyleSheet } from 'react-native';
import { useJobs } from '@/hooks/useJobs';
import { JobCard } from '@/components/jobs/JobCard';
import { Spinner } from '@/components/common/Spinner';
import { EmptyState } from '@/components/common/EmptyState';
import { ScreenWrapper } from '@/components/common/ScreenWrapper';
import { Colors } from '@/theme/colors';
import { FontSize } from '@/theme/typography';
import { BorderRadius, Spacing } from '@/theme/spacing';

/**
 * Renders a search input plus a live-filtered list of job postings. Reads
 * no route params; `navigation` is used to push `JobDetailScreen` with the
 * tapped job's id. Use case: dedicated search tab for a job seeker to find
 * postings by keyword, independent of the default HomeScreen feed.
 */
export function SearchScreen({ navigation }: { navigation: any }) {
  // useJobs shares jobStore's filter state with HomeScreen; updating
  // `filters` here (via setFilters) re-triggers the fetch inside the hook.
  const { jobs, loading, filters, setFilters } = useJobs();

  return (
    <ScreenWrapper>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          placeholder="Search jobs..."
          placeholderTextColor={Colors.textMuted}
          value={filters.search}
          // On each keystroke, update the shared search filter, which
          // triggers useJobs' effect to re-fetch matching jobs
          onChangeText={(text) => setFilters({ search: text })}
        />
      </View>
      {/* Loading state: spinner while a search fetch is in flight */}
      {loading ? (
        <Spinner />
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <JobCard
              job={item}
              // List item press: navigate to JobDetailScreen with the
              // tapped job's id as a route param
              onPress={() => navigation.navigate('JobDetail', { jobId: item.id })}
            />
          )}
          // Empty state shown when the search returns no matching jobs
          ListEmptyComponent={<EmptyState title="No results" description="Try a different search term." />}
        />
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  searchBar: { padding: Spacing[4], backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
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
  list: { padding: Spacing[4] },
});
