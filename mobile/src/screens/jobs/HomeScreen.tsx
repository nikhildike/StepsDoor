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

export function HomeScreen({ navigation }: { navigation: any }) {
  const { jobs, loading } = useJobs();

  if (loading) return <Spinner />;

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <Text style={styles.greeting}>Linksdoor</Text>
        <Text style={styles.subtitle}>Latest Jobs in India</Text>
      </View>
      <FlatList
        data={jobs}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <JobCard
            job={item}
            onPress={() => navigation.navigate('JobDetail', { jobId: item.id })}
          />
        )}
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
