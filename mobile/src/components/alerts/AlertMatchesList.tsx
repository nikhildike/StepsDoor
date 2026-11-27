/**
 * components/alerts/AlertMatchesList.tsx
 *
 * The open jobs a job alert matches — StepsDoor posts, company careers-page
 * openings and government jobs — newest first (GET /api/alerts/{id}/matches/).
 * Starts collapsed behind a summary line ("16 open jobs match: …"); tapping it
 * shows the jobs, each with a bookmark toggle and Apply. Tapping a job opens its
 * detail screen on the Jobs tab (company jobs open in the browser).
 *
 * Rendered under each job alert on AlertsScreen (a root-stack screen, hence the
 * root `navigation` prop). Rows are plain Views because the screen scrolls.
 * Mirrors the web `frontend/src/components/alerts/AlertMatches.jsx`.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { seekerService, AlertMatch, AlertMatches } from '@/services/seekerService';
import { useSavedJobs } from '@/hooks/useSavedJobs';
import { applyToJob, openJob } from '@/navigation/jobLinks';
import { SaveJobButton } from '@/components/jobs/SaveJobButton';
import { useThemeColors, ThemeColors } from '@/theme/colors';
import { FontSize, FontWeight } from '@/theme/typography';
import { BorderRadius, Spacing } from '@/theme/spacing';

// Match kind -> short source label on each row.
const SOURCE = { job: 'StepsDoor', company: 'Company careers', govt: 'Govt job' } as const;

/** "12 open jobs match: 5 on StepsDoor, 4 from company careers pages, 3 government". Same wording as the web. */
export function matchSummary({ count, counts }: Pick<AlertMatches, 'count' | 'counts'>) {
  if (!count) return 'No open jobs match yet';
  const parts = [
    counts.job && `${counts.job} on StepsDoor`,
    counts.company && `${counts.company} from company careers pages`,
    counts.govt && `${counts.govt} government`,
  ].filter(Boolean);
  return `${count.toLocaleString('en-IN')} open job${count === 1 ? '' : 's'} match: ${parts.join(', ')}`;
}

/**
 * One matching job: source label, title, employer · location, bookmark toggle
 * (when `canSave`) and Apply. Tapping the row opens the job (detail screen, or
 * the company's site for company jobs). Exported for the Home tab's
 * "Jobs matching your alerts" (`components/home/SeekerSummary.tsx`).
 */
export function AlertMatchRow({ job, navigation, first = false }: {
  job: AlertMatch;
  navigation: { navigate: (name: string, params?: object) => void };
  first?: boolean; // the first row in a box has no top border
}) {
  const Colors = useThemeColors();
  const styles = makeStyles(Colors);
  const { canSave, isSaved, isPending, toggleSave } = useSavedJobs();
  const facts = [job.company, job.location].filter(Boolean).join(' · ');
  return (
    <TouchableOpacity style={[styles.row, !first && styles.rowBorder]} activeOpacity={0.8}
      onPress={() => openJob(navigation, job.kind, job.id, job.apply_url)}>
      <View style={styles.rowText}>
        <Text style={styles.source}>{SOURCE[job.kind]}</Text>
        <Text style={styles.title} numberOfLines={2}>{job.title}</Text>
        {facts ? <Text style={styles.meta} numberOfLines={1}>{facts}</Text> : null}
      </View>
      <View style={styles.rowActions}>
        {canSave && (
          <SaveJobButton saved={isSaved(job.id, job.kind)} pending={isPending(job.id, job.kind)}
            onToggle={() => toggleSave(job.id, job.kind)} />
        )}
        <TouchableOpacity style={styles.apply} onPress={() => applyToJob(job.kind, job.id, job.apply_url)}
          accessibilityRole="link" accessibilityLabel={`Apply for ${job.title}`}>
          <Text style={styles.applyText}>Apply</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

/**
 * Props for `AlertMatchesList`.
 * - `alertId`: the job alert whose matches to list.
 * - `navigation`: root-stack navigation, to open detail screens on the Jobs tab.
 * - `reloadKey`: change it to refetch (e.g. after the alert was re-activated).
 */
interface Props {
  alertId: number;
  navigation: { navigate: (name: string, params?: object) => void };
  reloadKey?: unknown;
}

/** AlertMatchesList — see `Props`. */
export function AlertMatchesList({ alertId, navigation, reloadKey }: Props) {
  const Colors = useThemeColors();
  const styles = makeStyles(Colors);
  const [data, setData] = useState<AlertMatches | null>(null);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    seekerService.alertMatches(alertId, { limit: 20 })
      .then(({ data }) => { if (!cancelled) { setData(data); setError(false); } })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [alertId, reloadKey]);

  if (error) return <Text style={styles.muted}>Couldn't load matching jobs right now.</Text>;
  if (!data) return <Text style={styles.muted}>Finding matching jobs…</Text>;

  return (
    <View>
      <TouchableOpacity style={styles.toggle} onPress={() => setOpen((o) => !o)} disabled={data.count === 0}
        accessibilityRole="button" accessibilityState={{ expanded: open }}>
        <Text style={[styles.summary, data.count === 0 && styles.muted]}>{matchSummary(data)}</Text>
        {data.count > 0 && <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={Colors.primary} />}
      </TouchableOpacity>

      {open && data.count > 0 && (
        <View style={styles.box}>
          {data.results.map((job, i) => (
            <AlertMatchRow key={`${job.kind}:${job.id}`} job={job} navigation={navigation} first={i === 0} />
          ))}
          {data.count > data.results.length && (
            <Text style={[styles.muted, styles.more]}>
              Showing the {data.results.length} newest of {data.count.toLocaleString('en-IN')}.
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const makeStyles = (Colors: ThemeColors) => StyleSheet.create({
  muted: { fontSize: FontSize.xs, color: Colors.textSecondary },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  summary: { flexShrink: 1, fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.primary },
  box: { marginTop: Spacing[2], borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, backgroundColor: Colors.background },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing[2], padding: Spacing[3] },
  rowBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
  rowText: { flex: 1 },
  source: { fontSize: 10, fontWeight: FontWeight.medium, color: Colors.textSecondary, textTransform: 'uppercase' },
  title: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text, marginTop: 2 },
  meta: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2] },
  apply: { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing[2], paddingVertical: 4 },
  applyText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.primary },
  more: { padding: Spacing[3], paddingTop: 0 },
});
