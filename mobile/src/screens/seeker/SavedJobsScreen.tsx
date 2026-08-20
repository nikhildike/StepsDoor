/**
 * SavedJobsScreen.tsx
 *
 * Shows the job seeker's bookmarked private job listings. One of the
 * account-related "seeker" screens (alongside AlertsScreen/ProfileScreen);
 * not currently one of `AppNavigator`'s fixed 6 tab roots, but designed to
 * be pushed from account-related UI (e.g. from the Profile tab). Its
 * `navigation` prop is used to cross-navigate into the Jobs tab's stack to
 * reach `JobDetailScreen`.
 */
import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { jobService } from '@/services/jobService';
import { JobCard } from '@/components/jobs/JobCard';
import { Spinner } from '@/components/common/Spinner';
import { EmptyState } from '@/components/common/EmptyState';
import { ScreenWrapper } from '@/components/common/ScreenWrapper';
import { Spacing } from '@/theme/spacing';

interface SavedJob {
  id: number;
  job_post: {
    id: number;
    title: string;
    company_name: string;
    city: string;
    job_type: string;
    salary_min?: number;
    salary_max?: number;
    created_at: string;
  };
}

/**
 * Renders the list of jobs the current user has bookmarked. Reads no route
 * params; `navigation` is used to cross-navigate into the Jobs tab's stack
 * to open a detail screen. Use case: quick access to previously saved
 * listings so a job seeker doesn't have to re-search for them.
 */
export function SavedJobsScreen({ navigation }: { navigation: any }) {
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetches the user's saved-job records from GET /jobseekers/saved/ on
  // mount. Each record wraps the underlying job_post; falls back to an
  // empty list on error so EmptyState renders instead of crashing.
  useEffect(() => {
    setLoading(true);
    jobService
      .saved()
      .then(({ data }) => setSavedJobs(data.results ?? data))
      .catch(() => setSavedJobs([]))
      .finally(() => setLoading(false));
  }, []);

  // Loading state: block rendering the list until the fetch settles
  if (loading) return <Spinner />;

  return (
    <ScreenWrapper>
      <FlatList
        data={savedJobs}
        // Keyed by the saved-job record's own id (not the underlying job's id)
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <JobCard
            job={item.job_post}
            // List item press: this screen lives in a different tab stack
            // than JobDetailScreen, so navigation targets the Jobs tab by
            // name and nests the JobDetail route + params within it
            onPress={() =>
              navigation.navigate('Jobs', {
                screen: 'JobDetail',
                params: { jobId: item.job_post.id },
              })
            }
          />
        )}
        // Empty state shown when the user hasn't saved any jobs yet
        ListEmptyComponent={
          <EmptyState
            title="No saved jobs"
            description="Tap the bookmark icon on any job to save it here."
          />
        }
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  list: { padding: Spacing[4] },
});
