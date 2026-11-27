/**
 * components/tenders/TenderAlertsSection.tsx
 *
 * "Tender Alerts" on AlertsScreen for contractors: create an alert from a keyword
 * (suggested from open tender titles while typing) and an optional state, pause
 * or delete it, and see the open tenders each alert matches right now
 * (`TenderMatchesList`, collapsible), each with a bookmark. New matches are also
 * emailed daily by the backend (`match_tender_alerts`). Backed by
 * `/api/tenders/alerts/`. The tender counterpart of AlertsScreen's Job Alerts;
 * mirrors the web Alerts page's TenderAlertPanel.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tenderService } from '@/services/tenderService';
import { KeywordInput } from '@/components/alerts/KeywordInput';
import { TenderMatchesList } from '@/components/tenders/TenderMatchesList';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { useThemeColors, ThemeColors } from '@/theme/colors';
import { FontSize, FontWeight } from '@/theme/typography';
import { BorderRadius, Spacing } from '@/theme/spacing';

// A tender alert (backend TenderAlert); blank filters match anything.
interface TenderAlert {
  id: number;
  keyword: string;
  state: string;
  category: string;
  min_value: string | null;
  is_active: boolean;
}

/**
 * TenderAlertsSection
 *
 * `navigation` is the root stack's; the matches use it to open TenderDetail.
 */
export function TenderAlertsSection({ navigation }: { navigation: any }) {
  const Colors = useThemeColors();
  const styles = makeStyles(Colors);
  const [alerts, setAlerts] = useState<TenderAlert[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [state, setState] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    tenderService.alerts()
      .then(({ data }) => setAlerts(data.results ?? data))
      .catch(() => setAlerts([]))
      .finally(() => setLoaded(true));
  }, []);

  /** Create a tender alert from the form; needs a keyword or a state. */
  const create = async () => {
    if (!keyword.trim() && !state.trim()) {
      setFormError('Enter a keyword or a state.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const { data } = await tenderService.createAlert({ keyword: keyword.trim(), state: state.trim(), is_active: true });
      setAlerts((prev) => [data, ...prev]);
      setKeyword('');
      setState('');
      setShowForm(false);
    } catch {
      setFormError("Couldn't save the alert. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  /** Pause or re-activate an alert (optimistic, rolled back if the request fails). */
  const toggleActive = async (alert: TenderAlert) => {
    const next = !alert.is_active;
    setAlerts((prev) => prev.map((a) => (a.id === alert.id ? { ...a, is_active: next } : a)));
    try {
      await tenderService.updateAlert(alert.id, { is_active: next });
    } catch {
      setAlerts((prev) => prev.map((a) => (a.id === alert.id ? { ...a, is_active: !next } : a)));
    }
  };

  /** Delete an alert. */
  const remove = async (alert: TenderAlert) => {
    try {
      await tenderService.deleteAlert(alert.id);
      setAlerts((prev) => prev.filter((a) => a.id !== alert.id));
    } catch {
      // keep it listed
    }
  };

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.title}>Tender Alerts</Text>
        <TouchableOpacity onPress={() => setShowForm((v) => !v)} accessibilityRole="button" style={styles.newButton}>
          <Ionicons name={showForm ? 'close' : 'add'} size={16} color={Colors.primary} />
          <Text style={styles.newText}>{showForm ? 'Cancel' : 'New tender alert'}</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.intro}>Save a keyword and see every open tender it matches. New matches are also emailed daily.</Text>

      {showForm && (
        <View style={styles.card}>
          <KeywordInput label="Keyword" placeholder="e.g. road construction" value={keyword} onChangeText={setKeyword}
            fetchSuggestions={tenderService.keywordSuggestions} unit="tender" />
          <Input label="State (optional)" placeholder="e.g. Haryana" value={state} onChangeText={setState} />
          <Text style={styles.hint}>Every word must appear in the tender title or organisation.</Text>
          {formError ? <Text style={styles.error}>{formError}</Text> : null}
          <Button title="Create tender alert" onPress={create} loading={saving} />
        </View>
      )}

      {!loaded ? (
        <Text style={styles.detail}>Loading…</Text>
      ) : alerts.length === 0 && !showForm ? (
        <View style={styles.card}>
          <Text style={styles.emptyTitle}>No tender alerts yet</Text>
          <Text style={styles.detail}>Create one with a keyword like "road construction" to see every matching open tender.</Text>
        </View>
      ) : (
        alerts.map((alert) => (
          <View key={alert.id} style={styles.card}>
            <View style={styles.alertTop}>
              <View style={styles.chips}>
                {alert.keyword ? <Text style={styles.keyword}>"{alert.keyword}"</Text> : null}
                {alert.state ? <Badge label={alert.state} /> : null}
                {alert.category ? <Badge label={alert.category} /> : null}
                {!alert.keyword && !alert.state && !alert.category ? <Text style={styles.detail}>All tenders</Text> : null}
              </View>
              <Switch value={alert.is_active} onValueChange={() => toggleActive(alert)}
                accessibilityLabel={alert.is_active ? 'Pause tender alert' : 'Activate tender alert'} />
              <TouchableOpacity onPress={() => remove(alert)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Delete tender alert">
                <Ionicons name="trash-outline" size={18} color={Colors.error} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.status, !alert.is_active && styles.paused]}>{alert.is_active ? '● Active' : '○ Paused'}</Text>
            <TenderMatchesList alertId={alert.id} navigation={navigation} collapsible />
          </View>
        ))
      )}
    </View>
  );
}

const makeStyles = (Colors: ThemeColors) => StyleSheet.create({
  section: { marginBottom: Spacing[6] },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text, marginBottom: Spacing[2] },
  newButton: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  newText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.primary },
  intro: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing[3] },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing[4],
    marginBottom: Spacing[3],
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing[2],
  },
  hint: { fontSize: FontSize.xs, color: Colors.textSecondary },
  error: { fontSize: FontSize.sm, color: Colors.error },
  emptyTitle: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.text },
  alertTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2] },
  chips: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing[2] },
  keyword: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.text },
  status: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: Colors.success },
  paused: { color: Colors.textMuted },
  detail: { fontSize: FontSize.sm, color: Colors.textSecondary },
});
