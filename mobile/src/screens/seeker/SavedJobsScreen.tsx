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

export function SavedJobsScreen({ navigation }: { navigation: any }) {
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    jobService
      .saved()
      .then(({ data }) => setSavedJobs(data.results ?? data))
      .catch(() => setSavedJobs([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  return (
    <ScreenWrapper>
      <FlatList
        data={savedJobs}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <JobCard
            job={item.job_post}
            onPress={() =>
              navigation.navigate('Jobs', {
                screen: 'JobDetail',
                params: { jobId: item.job_post.id },
              })
            }
          />
        )}
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
