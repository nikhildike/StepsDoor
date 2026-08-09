import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View, TextInput } from 'react-native';
import { tenderService } from '@/services/tenderService';
import { TenderCard } from '@/components/tenders/TenderCard';
import { Spinner } from '@/components/common/Spinner';
import { EmptyState } from '@/components/common/EmptyState';
import { ScreenWrapper } from '@/components/common/ScreenWrapper';
import { Colors } from '@/theme/colors';
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

export function TendersScreen({ navigation }: { navigation: any }) {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    tenderService
      .list({ search })
      .then(({ data }) => setTenders(data.results ?? data))
      .catch(() => setTenders([]))
      .finally(() => setLoading(false));
  }, [search]);

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
      </View>
      {loading ? (
        <Spinner />
      ) : (
        <FlatList
          data={tenders}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TenderCard
              tender={item}
              onPress={() => navigation.navigate('TenderDetail', { tenderId: item.id })}
            />
          )}
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
