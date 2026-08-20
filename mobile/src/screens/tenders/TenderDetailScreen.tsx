/**
 * TenderDetailScreen.tsx
 *
 * Full-detail view for a single government tender listing. Belongs to the
 * Tenders tab's stack navigator (list → detail), pushed from
 * `TendersScreen` when a card is tapped.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Linking } from 'react-native';
import { tenderService } from '@/services/tenderService';
import { Button } from '@/components/common/Button';
import { Spinner } from '@/components/common/Spinner';
import { Badge } from '@/components/common/Badge';
import { ScreenWrapper } from '@/components/common/ScreenWrapper';
import { Colors } from '@/theme/colors';
import { FontSize, FontWeight } from '@/theme/typography';
import { Spacing } from '@/theme/spacing';

/**
 * Renders full details for one government tender: title, organisation,
 * state, category, estimated value, submission deadline, and description,
 * plus a "View on Portal" action linking to the source govt portal. Reads
 * `route.params.tenderId` (the tender's numeric id) to fetch the record.
 * Use case: destination screen when a job seeker taps a listing in
 * `TendersScreen` to read the full tender and open the originating portal.
 */
export function TenderDetailScreen({ route }: { route: any }) {
  const { tenderId } = route.params;
  const [tender, setTender] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetches the full tender record from GET /tenders/{tenderId}/ whenever
  // tenderId changes, clearing the loading state once the request settles.
  useEffect(() => {
    tenderService.get(tenderId).then(({ data }) => setTender(data)).finally(() => setLoading(false));
  }, [tenderId]);

  // Loading state: show a spinner until the fetch above resolves
  if (loading) return <Spinner />;
  // Defensive guard: render nothing if the tender failed to load (e.g. 404)
  if (!tender) return null;

  // Formats submission_deadline (ISO string) into a readable Indian locale
  // date, or null if the tender has no deadline set.
  const deadline = tender.submission_deadline
    ? new Date(tender.submission_deadline).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : null;

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{tender.title}</Text>
        <Text style={styles.org}>{tender.organisation}</Text>
        <Text style={styles.state}>{tender.state}</Text>
        <View style={styles.row}>
          <Badge label={tender.category} />
          {/* Estimated value is optional on the backend; hide if absent */}
          {tender.estimated_value && (
            <Text style={styles.value}>
              Est. ₹{(tender.estimated_value / 100000).toFixed(1)}L
            </Text>
          )}
        </View>
        {/* Deadline callout box, only rendered when a deadline was formatted above */}
        {deadline && (
          <View style={styles.deadlineBox}>
            <Text style={styles.deadlineLabel}>Submission Deadline</Text>
            <Text style={styles.deadlineDate}>{deadline}</Text>
          </View>
        )}
        <View style={styles.divider} />
        {tender.description ? (
          <Text style={styles.description}>{tender.description}</Text>
        ) : null}
        {/* Action button: opens the originating govt portal's tender page in
            the device browser, only shown when the backend provides a URL */}
        {tender.portal_url && (
          <View style={styles.actionButton}>
            <Button
              title="View on Portal →"
              onPress={() => Linking.openURL(tender.portal_url)}
            />
          </View>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing[5] },
  title: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text },
  org: { fontSize: FontSize.base, color: Colors.textSecondary, marginTop: Spacing[1] },
  state: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 4, marginBottom: Spacing[3] },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing[3] },
  value: { fontSize: FontSize.base, color: Colors.success, fontWeight: FontWeight.semibold },
  deadlineBox: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 10,
    padding: Spacing[4],
    marginBottom: Spacing[3],
  },
  deadlineLabel: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.5 },
  deadlineDate: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.primaryDark, marginTop: 4 },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing[4] },
  description: { fontSize: FontSize.base, color: Colors.text, lineHeight: 24 },
  actionButton: { marginTop: Spacing[8] },
});
