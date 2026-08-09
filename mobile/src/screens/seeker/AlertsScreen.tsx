import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { tenderService } from '@/services/tenderService';
import { govtJobService } from '@/services/govtJobService';
import { Spinner } from '@/components/common/Spinner';
import { EmptyState } from '@/components/common/EmptyState';
import { ScreenWrapper } from '@/components/common/ScreenWrapper';
import { Badge } from '@/components/common/Badge';
import { Colors } from '@/theme/colors';
import { FontSize, FontWeight } from '@/theme/typography';
import { BorderRadius, Spacing } from '@/theme/spacing';

interface Alert {
  id: number;
  type: 'tender' | 'govtjob';
  keywords?: string;
  category?: string;
  state?: string;
}

export function AlertsScreen() {
  const [tenderAlerts, setTenderAlerts] = useState<any[]>([]);
  const [govtJobAlerts, setGovtJobAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      tenderService.alerts().then(({ data }) => setTenderAlerts(data.results ?? data)).catch(() => {}),
      govtJobService.alerts().then(({ data }) => setGovtJobAlerts(data.results ?? data)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  const allAlerts: Alert[] = [
    ...tenderAlerts.map((a: any) => ({ ...a, type: 'tender' as const })),
    ...govtJobAlerts.map((a: any) => ({ ...a, type: 'govtjob' as const })),
  ];

  return (
    <ScreenWrapper>
      <FlatList
        data={allAlerts}
        keyExtractor={(item) => `${item.type}-${item.id}`}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.row}>
              <Badge
                label={item.type === 'tender' ? 'Tender Alert' : 'Govt Job Alert'}
                variant={item.type === 'tender' ? 'primary' : 'success'}
              />
            </View>
            {item.keywords && (
              <Text style={styles.detail}>Keywords: {item.keywords}</Text>
            )}
            {item.category && (
              <Text style={styles.detail}>Category: {item.category}</Text>
            )}
            {item.state && (
              <Text style={styles.detail}>State: {item.state}</Text>
            )}
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            title="No alerts set"
            description="Set up alerts from the Tenders or Government Jobs screens to get notified."
          />
        }
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  list: { padding: Spacing[4] },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing[4],
    marginBottom: Spacing[3],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  row: { marginBottom: Spacing[2] },
  detail: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 4 },
});
