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

export function TenderDetailScreen({ route }: { route: any }) {
  const { tenderId } = route.params;
  const [tender, setTender] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tenderService.get(tenderId).then(({ data }) => setTender(data)).finally(() => setLoading(false));
  }, [tenderId]);

  if (loading) return <Spinner />;
  if (!tender) return null;

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
          {tender.estimated_value && (
            <Text style={styles.value}>
              Est. ₹{(tender.estimated_value / 100000).toFixed(1)}L
            </Text>
          )}
        </View>
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
