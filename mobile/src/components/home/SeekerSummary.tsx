/**
 * components/home/SeekerSummary.tsx
 *
 * The job seeker's dashboard on the Home tab: three stat cards from
 * GET /api/jobseekers/stats/ — Saved Jobs, Active Alerts (with how many open
 * jobs they match) and New Jobs Today (open jobs added since midnight IST across
 * StepsDoor, company careers pages and govt jobs) — each opening its screen,
 * then the newest "Jobs matching your alerts" (GET /api/alerts/matches/), or a
 * prompt to create an alert when there are none.
 *
 * Rendered at the top of `screens/home/HomeTabScreen.tsx` for signed-in
 * accounts that aren't contractors or companies (it renders nothing otherwise).
 * Refetches whenever the Home tab comes into focus, so a job saved or an alert
 * created on another screen is counted. Mirrors the web dashboard
 * (`frontend/src/pages/seeker/Overview.jsx`).
 */
import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { seekerService, AlertMatches } from '@/services/seekerService';
import { useAuth } from '@/hooks/useAuth';
import { AlertMatchRow } from '@/components/alerts/AlertMatchesList';
import { useThemeColors, ThemeColors } from '@/theme/colors';
import { FontSize, FontWeight } from '@/theme/typography';
import { BorderRadius, Spacing } from '@/theme/spacing';

// GET /api/jobseekers/stats/ response.
interface Stats {
  saved_jobs: number;
  active_alerts: number;
  alert_matches: number;
  new_jobs_today: { total: number; job: number; company: number; govt: number };
}

// How many alert matches the Home tab previews (the Alerts screen lists more).
const MATCH_PREVIEW = 3;

/** "110 company · 10 govt" breakdown for New Jobs Today, or 'Since midnight' when there are none. */
export function todayNote(today?: Stats['new_jobs_today']) {
  if (!today || today.total === 0) return 'Since midnight';
  return [today.company && `${today.company} company`, today.govt && `${today.govt} govt`, today.job && `${today.job} StepsDoor`]
    .filter(Boolean).join(' · ');
}

/** SeekerSummary — no props; reads auth and fetches its own data. */
export function SeekerSummary() {
  const Colors = useThemeColors();
  const styles = makeStyles(Colors);
  const navigation = useNavigation<any>();
  const { isAuthenticated, user } = useAuth();
  const show = isAuthenticated && !user?.is_contractor && !user?.is_company;
  const [stats, setStats] = useState<Stats | null>(null);
  const [matches, setMatches] = useState<AlertMatches | null>(null);

  // Refresh each time the Home tab is shown; matches only when the seeker has an active alert.
  useFocusEffect(useCallback(() => {
    if (!show) return;
    let cancelled = false;
    seekerService.stats()
      .then(({ data }) => {
        if (cancelled) return;
        setStats(data);
        if (data.active_alerts > 0) {
          seekerService.allAlertMatches({ limit: MATCH_PREVIEW })
            .then(({ data: m }) => { if (!cancelled) setMatches(m); })
            .catch(() => { if (!cancelled) setMatches(null); });
        } else {
          setMatches(null);
        }
      })
      .catch(() => { if (!cancelled) setStats(null); });
    return () => { cancelled = true; };
  }, [show]));

  if (!show) return null;

  const fmt = (n?: number) => (n == null ? '–' : n.toLocaleString('en-IN'));
  const cards = [
    { label: 'Saved Jobs', value: fmt(stats?.saved_jobs), note: 'Your bookmarks', icon: 'bookmark', color: Colors.primary,
      onPress: () => navigation.navigate('SavedJobs') },
    { label: 'Active Alerts', value: fmt(stats?.active_alerts),
      note: stats?.active_alerts ? `${fmt(stats.alert_matches)} matching jobs` : 'Save a keyword',
      icon: 'notifications', color: Colors.secondary, onPress: () => navigation.navigate('Alerts') },
    { label: 'New Jobs Today', value: fmt(stats?.new_jobs_today.total), note: todayNote(stats?.new_jobs_today),
      icon: 'briefcase', color: Colors.success, onPress: () => navigation.navigate('Jobs', { screen: 'Home' }) },
  ];

  return (
    <View style={styles.wrap}>
      <View style={styles.cards}>
        {cards.map((c) => (
          <TouchableOpacity key={c.label} style={styles.card} onPress={c.onPress} activeOpacity={0.8}
            accessibilityRole="button" accessibilityLabel={`${c.label}: ${c.value}`}>
            <View style={[styles.icon, { backgroundColor: c.color }]}>
              <Ionicons name={c.icon as any} size={16} color={Colors.white} />
            </View>
            <Text style={styles.value}>{c.value}</Text>
            <Text style={styles.label} numberOfLines={1}>{c.label}</Text>
            <Text style={styles.note} numberOfLines={2}>{c.note}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {stats && (
        <View style={styles.matches}>
          <View style={styles.matchesHeader}>
            <Text style={styles.heading}>Jobs matching your alerts</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Alerts')} hitSlop={8}>
              <Text style={styles.link}>{stats.active_alerts ? 'See all' : 'Create alert'}</Text>
            </TouchableOpacity>
          </View>
          {stats.active_alerts === 0 ? (
            <Text style={styles.empty}>
              Save a keyword like "data analyst" and every matching job — StepsDoor, company and government — shows up here.
            </Text>
          ) : !matches ? (
            <Text style={styles.empty}>Finding matching jobs…</Text>
          ) : matches.results.length === 0 ? (
            <Text style={styles.empty}>No open jobs match your alerts yet.</Text>
          ) : (
            <View style={styles.box}>
              {matches.results.map((job, i) => (
                <AlertMatchRow key={`${job.kind}:${job.id}`} job={job} navigation={navigation} first={i === 0} />
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const makeStyles = (Colors: ThemeColors) => StyleSheet.create({
  wrap: { marginBottom: Spacing[5] },
  cards: { flexDirection: 'row', gap: Spacing[2] },
  card: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing[3],
  },
  icon: { width: 28, height: 28, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text, marginTop: Spacing[2] },
  label: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.text },
  note: { fontSize: 10, color: Colors.textSecondary, marginTop: 2 },
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
  box: { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, backgroundColor: Colors.surface },
});
