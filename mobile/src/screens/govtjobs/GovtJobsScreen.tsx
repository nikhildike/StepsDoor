/**
 * GovtJobsScreen.tsx
 *
 * List screen for the "Govt Jobs" bottom tab: a searchable feed of
 * government job listings. Root screen of that tab's stack navigator;
 * navigates to `GovtJobDetailScreen` on card tap.
 */
import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View, Text, TextInput, TouchableOpacity } from 'react-native';
import { govtJobService } from '@/services/govtJobService';
import { Spinner } from '@/components/common/Spinner';
import { EmptyState } from '@/components/common/EmptyState';
import { ScreenWrapper } from '@/components/common/ScreenWrapper';
import { Badge } from '@/components/common/Badge';
import { Colors } from '@/theme/colors';
import { FontSize, FontWeight } from '@/theme/typography';
import { BorderRadius, Spacing } from '@/theme/spacing';

interface GovtJob {
  id: number;
  title: string;
  organisation: string;
  state: string;
  category: string;
  vacancies?: number;
  last_date?: string;
  qualification?: string;
}

// Card renderer used as FlatList's renderItem below. Formats the deadline
// and flags jobs expiring within 3 days so the list can highlight urgency.
function GovtJobCard({ job, onPress }: { job: GovtJob; onPress: () => void }) {
  // Human-readable "last date to apply", or null if the job has none
  const lastDate = job.last_date
    ? new Date(job.last_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  // True when the deadline is less than 3 days away, used to style the
  // last-date text as urgent (red) in the card footer
  const isExpiringSoon = job.last_date
    ? (new Date(job.last_date).getTime() - Date.now()) < 3 * 86400000
    : false;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.title} numberOfLines={2}>{job.title}</Text>
      <Text style={styles.org}>{job.organisation}</Text>
      <Text style={styles.state}>{job.state}</Text>
      <View style={styles.footer}>
        <Badge label={job.category} />
        {job.vacancies && (
          <Text style={styles.vacancies}>{job.vacancies} vacancies</Text>
        )}
      </View>
      {lastDate && (
        <Text style={[styles.lastDate, isExpiringSoon && styles.lastDateUrgent]}>
          Last date: {lastDate}
        </Text>
      )}
    </TouchableOpacity>
  );
}

/**
 * Renders a searchable list of government job postings. Reads no route
 * params; `navigation` is used to push `GovtJobDetailScreen` with the
 * tapped job's id. Use case: primary browse/search entry point for the
 * "Govt Jobs" tab, letting a job seeker filter by keyword and drill into a
 * listing's full details.
 */
export function GovtJobsScreen({ navigation }: { navigation: any }) {
  const [jobs, setJobs] = useState<GovtJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Fetches govt jobs from GET /govtjobs/?search=... whenever the search
  // term changes (including the initial empty-string load). Falls back to
  // an empty list on error so the EmptyState renders instead of crashing.
  useEffect(() => {
    setLoading(true);
    govtJobService
      .list({ search })
      .then(({ data }) => setJobs(data.results ?? data))
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  }, [search]);

  return (
    <ScreenWrapper>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          placeholder="Search government jobs..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>
      {/* Loading state: spinner while the initial/search fetch is in flight */}
      {loading ? (
        <Spinner />
      ) : (
        <FlatList
          data={jobs}
          // Stable string key per job id, required by FlatList for
          // efficient re-renders/recycling
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <GovtJobCard
              job={item}
              // List item press: navigate to GovtJobDetailScreen with the
              // tapped job's id as a route param
              onPress={() => navigation.navigate('GovtJobDetail', { jobId: item.id })}
            />
          )}
          // Empty state shown when the search/fetch returns no results
          ListEmptyComponent={
            <EmptyState
              title="No government jobs found"
              description="Check back soon for new listings."
            />
          }
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
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing[4],
    marginBottom: Spacing[3],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.text },
  org: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 4 },
  state: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing[3] },
  vacancies: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.medium },
  lastDate: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: Spacing[2] },
  lastDateUrgent: { color: Colors.error, fontWeight: FontWeight.semibold },
});
