/**
 * HomeScreen.tsx
 *
 * Root screen of the "Jobs" bottom tab: shows the latest private job
 * listings (company-paid posts) as a simple feed. Root of that tab's stack
 * navigator; navigates to `JobDetailScreen` on card tap.
 */
import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useJobs } from '@/hooks/useJobs';
import { JobCard } from '@/components/jobs/JobCard';
import { Spinner } from '@/components/common/Spinner';
import { EmptyState } from '@/components/common/EmptyState';
import { ScreenWrapper } from '@/components/common/ScreenWrapper';
import { Colors } from '@/theme/colors';
import { FontSize, FontWeight } from '@/theme/typography';
import { Spacing } from '@/theme/spacing';

/**
 * Renders the branded header plus a list of the latest job postings. Reads
 * no route params; `navigation` is used to push `JobDetailScreen` with the
 * tapped job's id. Use case: default landing view of the Jobs tab, giving a
 * job seeker a quick browse of newly posted private job listings.
 */
export function HomeScreen({ navigation }: { navigation: any }) {
  // useJobs fetches the job list (server-side filtered by jobStore's
  // current filters) and exposes loading state; see hooks/useJobs.ts.
  const { jobs, loading } = useJobs();

  // Loading state: block rendering the list until the fetch settles
  if (loading) return <Spinner />;

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <Text style={styles.greeting}>StepsDoor</Text>
        <Text style={styles.subtitle}>Latest Jobs in India</Text>
      </View>
      <FlatList
        data={jobs}
        // Stable string key per job id
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
        // Empty state shown when there are no jobs to display
        ListEmptyComponent={
          <EmptyState title="No jobs yet" description="Check back soon for new listings." />
        }
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: { padding: Spacing[5], backgroundColor: Colors.primary },
  greeting: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.white },
  subtitle: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  list: { padding: Spacing[4] },
});
