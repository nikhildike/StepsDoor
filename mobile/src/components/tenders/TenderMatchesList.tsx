/**
 * components/tenders/TenderMatchesList.tsx
 *
 * The open tenders a tender alert matches, soonest closing first
 * (GET /api/tenders/alerts/{id}/matches/), as TenderCards with a bookmark
 * toggle. With `alertId` omitted it shows the tenders matching any active alert
 * (GET /api/tenders/alerts/matches/). `collapsible` starts it behind a
 * "4 open tenders match" summary that expands on tap.
 *
 * Used under each tender alert on AlertsScreen (collapsible) and by the Home
 * tab's ContractorSummary (preview). Cards open TenderDetail on the Tenders tab
 * via the root navigator. Mirrors the web `components/tenders/TenderAlertMatches.jsx`.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tenderService, TenderSummary } from '@/services/tenderService';
import { useSavedTenders } from '@/hooks/useSavedTenders';
import { TenderCard } from '@/components/tenders/TenderCard';
import { useThemeColors, ThemeColors } from '@/theme/colors';
import { FontSize, FontWeight } from '@/theme/typography';
import { Spacing } from '@/theme/spacing';

/** "4 open tenders match" / "No open tenders match yet" (same wording as the web). */
export function tenderMatchSummary(count: number) {
  if (!count) return 'No open tenders match yet';
  return `${count.toLocaleString('en-IN')} open tender${count === 1 ? '' : 's'} match`;
}

/**
 * Props for `TenderMatchesList`.
 * - `alertId`: the tender alert whose matches to list; omit for all active alerts.
 * - `navigation`: root-stack (or nested) navigation, to open TenderDetail.
 * - `collapsible`: start collapsed behind the summary (default false).
 * - `limit`: how many tenders to fetch (default 20; the summary counts all).
 * - `emptyText`: shown when nothing matches.
 */
interface Props {
  alertId?: number;
  navigation: { navigate: (name: string, params?: object) => void };
  collapsible?: boolean;
  limit?: number;
  emptyText?: string;
}

/** TenderMatchesList — see `Props`. */
export function TenderMatchesList({ alertId, navigation, collapsible = false, limit = 20, emptyText }: Props) {
  const Colors = useThemeColors();
  const styles = makeStyles(Colors);
  const { canSave, isSaved, isPending, toggleSave } = useSavedTenders();
  const [data, setData] = useState<{ count: number; results: TenderSummary[] } | null>(null);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(!collapsible);

  useEffect(() => {
    let cancelled = false;
    const request = alertId ? tenderService.alertMatches(alertId, { limit }) : tenderService.allAlertMatches({ limit });
    request
      .then(({ data }) => { if (!cancelled) { setData(data); setError(false); } })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [alertId, limit]);

  if (error) return <Text style={styles.muted}>Couldn't load matching tenders right now.</Text>;
  if (!data) return <Text style={styles.muted}>Finding matching tenders…</Text>;

  const list = data.results.length === 0 ? (
    <Text style={styles.empty}>{emptyText || 'No open tenders match this alert yet.'}</Text>
  ) : (
    <View style={styles.list}>
      {data.results.map((t) => (
        <TenderCard
          key={t.id}
          tender={t}
          onPress={() => navigation.navigate('App', { screen: 'Tenders', params: { screen: 'TenderDetail', params: { tenderId: t.id } } })}
          save={canSave ? { saved: isSaved(t.id), pending: isPending(t.id), onToggle: () => toggleSave(t.id) } : null}
        />
      ))}
      {data.count > data.results.length && (
        <Text style={styles.muted}>Showing the {data.results.length} closing soonest of {data.count.toLocaleString('en-IN')}.</Text>
      )}
    </View>
  );

  if (!collapsible) return list;

  return (
    <View>
      <TouchableOpacity style={styles.toggle} onPress={() => setOpen((o) => !o)} disabled={data.count === 0}
        accessibilityRole="button" accessibilityState={{ expanded: open }}>
        <Text style={[styles.summary, data.count === 0 && styles.muted]}>{tenderMatchSummary(data.count)}</Text>
        {data.count > 0 && <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={Colors.primary} />}
      </TouchableOpacity>
      {open && data.count > 0 && list}
    </View>
  );
}

const makeStyles = (Colors: ThemeColors) => StyleSheet.create({
  muted: { fontSize: FontSize.xs, color: Colors.textSecondary },
  empty: { fontSize: FontSize.sm, color: Colors.textSecondary, paddingVertical: Spacing[3] },
  list: { marginTop: Spacing[2] },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  summary: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.primary },
});
