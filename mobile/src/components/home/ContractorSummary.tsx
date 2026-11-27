/**
 * components/home/ContractorSummary.tsx
 *
 * The contractor's dashboard on the Home tab: stat cards from
 * GET /api/tenders/stats/ — New Today (open tenders first scraped since midnight
 * IST, with the total open in the note), Saved Tenders and Tender Alerts (with
 * how many open tenders they match) — each opening its screen, then the open
 * tenders matching their alerts closing soonest (`TenderMatchesList`), or a
 * prompt to create an alert.
 *
 * Rendered at the top of `screens/home/HomeTabScreen.tsx` for contractors only
 * (renders nothing otherwise). Refetches when the Home tab comes into focus.
 * The tender counterpart of `SeekerSummary`; mirrors the web ContractorDashboard.
 */
import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { tenderService } from '@/services/tenderService';
import { useAuth } from '@/hooks/useAuth';
import { TenderMatchesList } from '@/components/tenders/TenderMatchesList';
import { StatCard, StatCards, formatCount } from '@/components/home/StatCards';
import { useThemeColors, ThemeColors } from '@/theme/colors';
import { FontSize, FontWeight } from '@/theme/typography';
import { BorderRadius, Spacing } from '@/theme/spacing';

// GET /api/tenders/stats/ response.
interface TenderStats {
  saved_tenders: number;
  active_alerts: number;
  alert_matches: number;
  new_today: number;
  open_tenders: number;
}

// How many matching tenders the Home tab previews (the Alerts screen lists more).
const MATCH_PREVIEW = 3;

/** ContractorSummary — no props; reads auth and fetches its own data. */
export function ContractorSummary() {
  const Colors = useThemeColors();
  const styles = makeStyles(Colors);
  const navigation = useNavigation<any>();
  const { isAuthenticated, user } = useAuth();
  const show = isAuthenticated && !!user?.is_contractor;
  const [stats, setStats] = useState<TenderStats | null>(null);
  const [refreshKey, setRefreshKey] = useState(0); // remounts the matches list on focus

  // Refresh the counts (and the matches) each time the Home tab is shown.
  useFocusEffect(useCallback(() => {
    if (!show) return undefined;
    let cancelled = false;
    tenderService.stats()
      .then(({ data }) => { if (!cancelled) { setStats(data); setRefreshKey((k) => k + 1); } })
      .catch(() => { if (!cancelled) setStats(null); });
    return () => { cancelled = true; };
  }, [show]));

  if (!show) return null;

  const cards: StatCard[] = [
    { label: 'New Today', value: formatCount(stats?.new_today),
      note: stats ? `${formatCount(stats.open_tenders)} open in all` : 'Since midnight',
      icon: 'document-text', color: Colors.primary, onPress: () => navigation.navigate('Tenders', { screen: 'TendersList' }) },
    { label: 'Saved Tenders', value: formatCount(stats?.saved_tenders), note: 'Your bookmarks',
      icon: 'bookmark', color: Colors.secondary, onPress: () => navigation.navigate('SavedTenders') },
    { label: 'Tender Alerts', value: formatCount(stats?.active_alerts),
      note: stats?.active_alerts ? `${formatCount(stats.alert_matches)} matching` : 'Save a keyword',
      icon: 'notifications', color: Colors.success, onPress: () => navigation.navigate('Alerts') },
  ];

  return (
    <View style={styles.wrap}>
      <StatCards cards={cards} />

      {stats && (
        <View style={styles.matches}>
          <View style={styles.matchesHeader}>
            <Text style={styles.heading}>Tenders matching your alerts</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Alerts')} hitSlop={8}>
              <Text style={styles.link}>{stats.active_alerts ? 'See all' : 'Create alert'}</Text>
            </TouchableOpacity>
          </View>
          {stats.active_alerts === 0 ? (
            <Text style={styles.empty}>Save a keyword like "road construction" and every matching open tender shows up here.</Text>
          ) : (
            <TenderMatchesList key={refreshKey} navigation={navigation} limit={MATCH_PREVIEW}
              emptyText="No open tenders match your alerts yet." />
          )}
        </View>
      )}
    </View>
  );
}

const makeStyles = (Colors: ThemeColors) => StyleSheet.create({
  wrap: { marginBottom: Spacing[5] },
  matches: { marginTop: Spacing[4] },
  matchesHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing[2] },
  heading: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text },
  link: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.primary },
  empty: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing[3],
  },
});
