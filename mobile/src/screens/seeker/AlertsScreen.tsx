/**
 * AlertsScreen.tsx
 *
 * The signed-in user's alerts. Reached via `BurgerMenu`'s "Alerts" item
 * (root-stack screen — see `navigation/index.tsx`).
 *
 * - Job Alerts (job seekers): save a keyword (suggested from open job titles
 *   while typing — `KeywordInput`) and optionally a city, pause or
 *   delete it, and see the open jobs it matches right now — StepsDoor posts,
 *   company careers pages and government jobs — under each alert
 *   (`AlertMatchesList`), each with save and apply. Backed by `/api/alerts/`.
 *   Mirrors the web Alerts page's job alert panel.
 * - Tender Alerts (contractors): `TenderAlertsSection` — keyword (suggested from
 *   open tender titles) and state, pause/delete, and each alert's matching
 *   open tenders with bookmarks.
 * - Other alerts (govt job alerts, and tender alerts of non-contractors): a
 *   read-only list (created on the web or from the Govt Jobs screens).
 * Guests see the sign-in prompt.
 */
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View, Text, TouchableOpacity, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tenderService } from '@/services/tenderService';
import { govtJobService } from '@/services/govtJobService';
import { seekerService, JobAlert } from '@/services/seekerService';
import { useAuth } from '@/hooks/useAuth';
import { AlertMatchesList } from '@/components/alerts/AlertMatchesList';
import { KeywordInput } from '@/components/alerts/KeywordInput';
import { TenderAlertsSection } from '@/components/tenders/TenderAlertsSection';
import { Spinner } from '@/components/common/Spinner';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { MembersOnly } from '@/components/common/MembersOnly';
import { Badge } from '@/components/common/Badge';
import { useThemeColors, ThemeColors } from '@/theme/colors';
import { FontSize, FontWeight } from '@/theme/typography';
import { BorderRadius, Spacing } from '@/theme/spacing';

// A tender or govt job alert in the read-only list, tagged with its type.
interface OtherAlert {
  id: number;
  type: 'tender' | 'govtjob';
  keyword?: string;
  keywords?: string;
  category?: string;
  state?: string;
}

/**
 * AlertsScreen
 *
 * `navigation` is the root stack's; alert matches use it to open job screens.
 */
export function AlertsScreen({ navigation }: { navigation: any }) {
  const Colors = useThemeColors();
  const styles = makeStyles(Colors);
  const { isAuthenticated, user } = useAuth();
  // Job alerts are for job seekers; contractors and companies don't get the section.
  const showJobAlerts = !user?.is_contractor && !user?.is_company;
  // Contractors manage their tender alerts (with matching tenders) in their own section.
  const showTenderAlerts = !!user?.is_contractor;

  const [jobAlerts, setJobAlerts] = useState<JobAlert[]>([]);
  const [otherAlerts, setOtherAlerts] = useState<OtherAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [city, setCity] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Load all alert lists in parallel; each fails on its own (empty list) without blanking the others.
  useEffect(() => {
    if (!isAuthenticated) return;
    Promise.all([
      showJobAlerts
        ? seekerService.alerts().then(({ data }) => setJobAlerts(data.results ?? data)).catch(() => {})
        : Promise.resolve(),
      tenderService.alerts().then(({ data }) => (data.results ?? data).map((a: any) => ({ ...a, type: 'tender' })))
        .catch(() => []),
      govtJobService.alerts().then(({ data }) => (data.results ?? data).map((a: any) => ({ ...a, type: 'govtjob' })))
        .catch(() => []),
    ]).then(([, tenders, govt]) => setOtherAlerts([...(tenders as OtherAlert[]), ...(govt as OtherAlert[])]))
      .finally(() => setLoading(false));
  }, [isAuthenticated, showJobAlerts]);

  /** Create a job alert from the form; needs a keyword or a city. */
  const create = async () => {
    if (!keyword.trim() && !city.trim()) {
      setFormError('Enter a keyword or a city.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const { data } = await seekerService.createAlert({ role_keyword: keyword.trim(), city: city.trim(), is_active: true });
      setJobAlerts((prev) => [data, ...prev]);
      setKeyword('');
      setCity('');
      setShowForm(false);
    } catch {
      setFormError("Couldn't save the alert. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  /** Pause or re-activate a job alert (optimistic, rolled back if the request fails). */
  const toggleActive = async (alert: JobAlert) => {
    const next = !alert.is_active;
    setJobAlerts((prev) => prev.map((a) => (a.id === alert.id ? { ...a, is_active: next } : a)));
    try {
      await seekerService.updateAlert(alert.id, { is_active: next });
    } catch {
      setJobAlerts((prev) => prev.map((a) => (a.id === alert.id ? { ...a, is_active: !next } : a)));
    }
  };

  /** Delete a job alert. */
  const remove = async (alert: JobAlert) => {
    try {
      await seekerService.deleteAlert(alert.id);
      setJobAlerts((prev) => prev.filter((a) => a.id !== alert.id));
    } catch {
      // keep it listed
    }
  };

  // Tender alerts shown (editable) in TenderAlertsSection aren't repeated in the read-only list.
  const readOnlyAlerts = showTenderAlerts ? otherAlerts.filter((a) => a.type !== 'tender') : otherAlerts;

  if (!isAuthenticated) return <MembersOnly what="your alerts" />;
  if (loading) return <Spinner />;

  return (
    // "handled": a tap on a keyword suggestion works while the keyboard is open.
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {showJobAlerts && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Job Alerts</Text>
            <TouchableOpacity onPress={() => setShowForm((v) => !v)} accessibilityRole="button" style={styles.newButton}>
              <Ionicons name={showForm ? 'close' : 'add'} size={16} color={Colors.primary} />
              <Text style={styles.newText}>{showForm ? 'Cancel' : 'New alert'}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.intro}>
            Save a keyword and see every matching job — on StepsDoor, on company careers pages and from government recruiters.
          </Text>

          {showForm && (
            <View style={styles.card}>
              {/* Suggests keywords from open job titles while typing. */}
              <KeywordInput label="Role / keyword" placeholder="e.g. Data Analyst" value={keyword} onChangeText={setKeyword} />
              <Input label="City (optional)" placeholder="e.g. Bangalore" value={city} onChangeText={setCity} />
              <Text style={styles.hint}>
                Every word must appear in the job title or company. Government jobs aren't tied to a city, so a city leaves them out.
              </Text>
              {formError ? <Text style={styles.error}>{formError}</Text> : null}
              <Button title="Create alert" onPress={create} loading={saving} />
            </View>
          )}

          {jobAlerts.length === 0 && !showForm ? (
            <View style={styles.card}>
              <Text style={styles.emptyTitle}>No job alerts yet</Text>
              <Text style={styles.detail}>Create one with a keyword like "data analyst" to see every matching job in one place.</Text>
            </View>
          ) : (
            jobAlerts.map((alert) => (
              <View key={alert.id} style={styles.card}>
                <View style={styles.alertTop}>
                  <View style={styles.chips}>
                    {alert.role_keyword ? <Text style={styles.keyword}>"{alert.role_keyword}"</Text> : null}
                    {alert.city ? <Badge label={alert.city} /> : null}
                    {!alert.role_keyword && !alert.city ? <Text style={styles.detail}>All jobs</Text> : null}
                  </View>
                  <Switch value={alert.is_active} onValueChange={() => toggleActive(alert)}
                    accessibilityLabel={alert.is_active ? 'Pause alert' : 'Activate alert'} />
                  <TouchableOpacity onPress={() => remove(alert)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Delete alert">
                    <Ionicons name="trash-outline" size={18} color={Colors.error} />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.status, !alert.is_active && styles.paused]}>{alert.is_active ? '● Active' : '○ Paused'}</Text>
                <AlertMatchesList alertId={alert.id} navigation={navigation} />
              </View>
            ))
          )}
        </View>
      )}

      {showTenderAlerts && <TenderAlertsSection navigation={navigation} />}

      {/* Read-only: alerts this screen can't edit (the contractor's tender alerts are above). */}
      {readOnlyAlerts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{showTenderAlerts ? 'Govt Job Alerts' : 'Tender & Govt Job Alerts'}</Text>
          {readOnlyAlerts.map((item) => (
            <View key={`${item.type}-${item.id}`} style={styles.card}>
              <View style={styles.badgeRow}>
                <Badge label={item.type === 'tender' ? 'Tender Alert' : 'Govt Job Alert'}
                  variant={item.type === 'tender' ? 'primary' : 'success'} />
              </View>
              {item.keyword || item.keywords ? <Text style={styles.detail}>Keyword: {item.keyword || item.keywords}</Text> : null}
              {item.category ? <Text style={styles.detail}>Category: {item.category}</Text> : null}
              {item.state ? <Text style={styles.detail}>State: {item.state}</Text> : null}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const makeStyles = (Colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing[4] },
  section: { marginBottom: Spacing[6] },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text, marginBottom: Spacing[2] },
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
  badgeRow: { flexDirection: 'row' },
  detail: { fontSize: FontSize.sm, color: Colors.textSecondary },
});
