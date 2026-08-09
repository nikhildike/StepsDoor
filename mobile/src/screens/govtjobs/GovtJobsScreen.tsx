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

function GovtJobCard({ job, onPress }: { job: GovtJob; onPress: () => void }) {
  const lastDate = job.last_date
    ? new Date(job.last_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

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

export function GovtJobsScreen({ navigation }: { navigation: any }) {
  const [jobs, setJobs] = useState<GovtJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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
      {loading ? (
        <Spinner />
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <GovtJobCard
              job={item}
              onPress={() => navigation.navigate('GovtJobDetail', { jobId: item.id })}
            />
          )}
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
