/**
 * SavedJobsScreen.tsx
 *
 * Every job the seeker has bookmarked — StepsDoor posts, openings from company
 * careers pages and government jobs — with Apply and Remove actions. Jobs that
 * have since closed stay listed, marked "Closed". Reached from the BurgerMenu's
 * "Saved Jobs" item (root-stack screen `SavedJobs`, see navigation/index.tsx).
 *
 * Reloads whenever the screen comes into focus, so jobs saved on other tabs
 * appear, and keeps the app-wide saved-jobs store in sync. Tapping a card opens
 * the job's detail screen on the Jobs tab (company jobs open in the browser).
 * Mirrors the web `frontend/src/pages/seeker/SavedJobs.jsx`.
 */
import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { seekerService, SavedJob, SAVED_ID_FIELD } from '@/services/seekerService';
import { useSavedJobsStore } from '@/store/savedJobsStore';
import { useAuth } from '@/hooks/useAuth';
import { applyToJob, openJob } from '@/navigation/jobLinks';
import { Spinner } from '@/components/common/Spinner';
import { EmptyState } from '@/components/common/EmptyState';
import { MembersOnly } from '@/components/common/MembersOnly';
import { ScreenWrapper } from '@/components/common/ScreenWrapper';
import { useThemeColors, ThemeColors } from '@/theme/colors';
import { FontSize, FontWeight } from '@/theme/typography';
import { BorderRadius, Spacing } from '@/theme/spacing';

// Saved-job kind -> where the job came from, shown on each card.
const SOURCE_LABELS = { job: 'StepsDoor', company: 'Company careers page', govt: 'Government job' } as const;

/** "Apply by 1 Dec 2026" for a deadline, '' when there is none. */
function deadlineText(iso: string | null) {
  return iso ? `Apply by ${new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : '';
}

/**
 * SavedJobsScreen
 *
 * `navigation` is the root stack's, used to open detail screens on the Jobs tab.
 * Guests see the sign-in prompt.
 */
export function SavedJobsScreen({ navigation }: { navigation: any }) {
  const Colors = useThemeColors();
  const styles = makeStyles(Colors);
  const { isAuthenticated } = useAuth();
  const setFromList = useSavedJobsStore((s) => s.setFromList);
  const toggle = useSavedJobsStore((s) => s.toggle);
  const [items, setItems] = useState<SavedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /** Fetch the saved list and sync the app-wide store with it. */
  const load = useCallback(() => {
    return seekerService.savedJobs()
      .then(({ data }) => {
        const list: SavedJob[] = data.results ?? data;
        setItems(list);
        setFromList(list);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [setFromList]);

  // Reload each time the screen is shown (jobs may have been saved on other tabs).
  useFocusEffect(useCallback(() => {
    if (isAuthenticated) load();
  }, [isAuthenticated, load]));

  /** Remove a bookmark: through the store (so cards elsewhere update), then from this list. */
  const remove = async (s: SavedJob) => {
    const jobId = s[SAVED_ID_FIELD[s.kind]];
    if (jobId == null) return;
    try {
      await toggle(jobId, s.kind);
      setItems((prev) => prev.filter((x) => x.id !== s.id));
    } catch {
      // leave it listed; the user can try again
    }
  };

  if (!isAuthenticated) return <MembersOnly what="your saved jobs" />;
  if (loading) return <Spinner />;

  return (
    <ScreenWrapper>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load().finally(() => setRefreshing(false)); }} />
        }
        ListHeaderComponent={
          items.length ? <Text style={styles.count}>{items.length} saved job{items.length === 1 ? '' : 's'}</Text> : null
        }
        renderItem={({ item }) => {
          const jobId = item[SAVED_ID_FIELD[item.kind]] as number;
          const facts = [item.city, deadlineText(item.deadline)].filter(Boolean).join(' · ');
          return (
            <TouchableOpacity style={styles.card} activeOpacity={0.8}
              onPress={() => openJob(navigation, item.kind, jobId, item.redirect_url)}>
              <View style={styles.labels}>
                <Text style={styles.source}>{SOURCE_LABELS[item.kind]}</Text>
                {!item.is_open && <Text style={styles.closed}>Closed</Text>}
              </View>
              <Text style={styles.title} numberOfLines={2}>{item.job_title}</Text>
              <Text style={styles.company} numberOfLines={1}>{item.company_name}</Text>
              {facts ? <Text style={styles.meta} numberOfLines={1}>{facts}</Text> : null}
              <View style={styles.actions}>
                {item.is_open && (
                  <TouchableOpacity style={styles.apply} onPress={() => applyToJob(item.kind, jobId, item.redirect_url)}
                    accessibilityRole="link">
                    <Text style={styles.applyText}>Apply</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.remove} onPress={() => remove(item)} accessibilityRole="button"
                  accessibilityLabel={`Remove ${item.job_title} from saved`}>
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            title="No saved jobs"
            description="Tap the bookmark on any job — StepsDoor, company or government — to keep it here."
          />
        }
      />
    </ScreenWrapper>
  );
}

const makeStyles = (Colors: ThemeColors) => StyleSheet.create({
  list: { padding: Spacing[4] },
  count: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing[3] },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing[4],
    marginBottom: Spacing[3],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  labels: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2], marginBottom: 4 },
  source: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: Colors.textSecondary, textTransform: 'uppercase' },
  closed: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
    backgroundColor: Colors.background,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: BorderRadius.sm,
  },
  title: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.text },
  company: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  meta: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  actions: { flexDirection: 'row', gap: Spacing[2], marginTop: Spacing[3] },
  apply: { backgroundColor: Colors.primary, borderRadius: BorderRadius.md, paddingHorizontal: Spacing[4], paddingVertical: Spacing[2] },
  applyText: { color: Colors.white, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  remove: { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, paddingHorizontal: Spacing[4], paddingVertical: Spacing[2] },
  removeText: { color: Colors.error, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
});
