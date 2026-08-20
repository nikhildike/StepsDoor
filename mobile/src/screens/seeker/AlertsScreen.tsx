/**
 * AlertsScreen.tsx
 *
 * Shows the job seeker's saved Tender and Govt Job alerts in one merged
 * list. Lives in the "Alerts" bottom tab (account-related content, alongside
 * SavedJobs and Profile). Note: this app has no "Job" alerts — job alert
 * matching only applies to tenders/govt jobs per the alerts backend app.
 */
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

/**
 * Renders a combined, read-only list of the user's Tender alerts and Govt
 * Job alerts (keyword/category/state subscriptions). Reads no route params.
 * Use case: lets a job seeker review what alerts they've configured (alerts
 * are created from `TendersScreen`/`GovtJobsScreen`, not from this screen).
 */
export function AlertsScreen() {
  const [tenderAlerts, setTenderAlerts] = useState<any[]>([]);
  const [govtJobAlerts, setGovtJobAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetches both alert lists in parallel on mount: GET /tenders/alerts/ and
  // GET /govtjobs/alerts/. Each is caught independently so one failing
  // endpoint doesn't blank out the other's results.
  useEffect(() => {
    setLoading(true);
    Promise.all([
      tenderService.alerts().then(({ data }) => setTenderAlerts(data.results ?? data)).catch(() => {}),
      govtJobService.alerts().then(({ data }) => setGovtJobAlerts(data.results ?? data)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  // Loading state: block rendering until both alert fetches settle
  if (loading) return <Spinner />;

  // Merge both alert lists into one array, tagging each row with its
  // `type` so the renderItem below can label/style it appropriately
  const allAlerts: Alert[] = [
    ...tenderAlerts.map((a: any) => ({ ...a, type: 'tender' as const })),
    ...govtJobAlerts.map((a: any) => ({ ...a, type: 'govtjob' as const })),
  ];

  return (
    <ScreenWrapper>
      <FlatList
        data={allAlerts}
        // Composite key since ids can collide across the two alert types
        keyExtractor={(item) => `${item.type}-${item.id}`}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.row}>
              {/* Badge distinguishes a Tender alert from a Govt Job alert */}
              <Badge
                label={item.type === 'tender' ? 'Tender Alert' : 'Govt Job Alert'}
                variant={item.type === 'tender' ? 'primary' : 'success'}
              />
            </View>
            {/* Each detail line only renders when that alert field is set */}
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
        // Empty state shown when the user has no alerts configured
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
