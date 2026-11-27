/**
 * List-item card for a government tender listing. Rendered inside the
 * Tenders tab's list screen (`TendersScreen`, via
 * `TendersStackNavigator`) and anywhere else a tender needs a compact
 * preview. Tapping the card navigates to `TenderDetailScreen`.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useThemeColors, ThemeColors } from '@/theme/colors';
import { FontSize, FontWeight } from '@/theme/typography';
import { BorderRadius, Spacing } from '@/theme/spacing';
import { SaveJobButton } from '@/components/jobs/SaveJobButton';
import { Badge } from '@/components/common/Badge';

/**
 * Props for `TenderCard`.
 * - `tender`: the tender listing data to display —
 *   - `id`: tender's unique identifier.
 *   - `title`: tender title, shown truncated to 2 lines.
 *   - `organisation`: issuing government organisation's name.
 *   - `state`: state/region the tender applies to.
 *   - `category`: tender category, shown in a Badge.
 *   - `estimated_value` (optional): estimated tender value in rupees;
 *     when present, rendered as "Est. value: ₹X.XL" (converted to
 *     lakhs).
 *   - `submission_deadline` (optional): ISO date string for the
 *     submission deadline; when present, formatted and shown, and
 *     highlighted in red if it falls within 3 days.
 * - `onPress`: handler invoked when the card is tapped — the caller
 *   (list screen) supplies navigation to `TenderDetailScreen` with this
 *   tender's id.
 */
interface Props {
  tender: {
    id: number;
    title: string;
    organisation: string;
    state: string;
    category: string;
    estimated_value?: number;
    submission_deadline?: string;
  };
  onPress: () => void;
  /** Optional bookmark toggle `{ saved, pending, onToggle }` (omitted for guests/company accounts). */
  save?: { saved: boolean; pending?: boolean; onToggle: () => void } | null;
  /** Shows "Closed" instead of the deadline (a saved tender whose bidding has ended). */
  closed?: boolean;
}

/**
 * TenderCard
 *
 * Renders a tappable card summarizing a tender: title, organisation,
 * state, a category Badge, a formatted submission deadline (highlighted
 * if expiring soon), and (if available) a formatted estimated value.
 * Used as the list-item renderer for tender listing screens.
 *
 * Props: see `Props` interface above.
 */
export function TenderCard({ tender, onPress, save, closed = false }: Props) {
  const Colors = useThemeColors();
  const styles = makeStyles(Colors);
  // Format the raw ISO deadline into a localized "D Mon YYYY" string for
  // display; null when no deadline was provided by the API.
  const deadline = tender.submission_deadline
    ? new Date(tender.submission_deadline).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
      })
    : null;

  // True when the deadline is less than 3 days away (or already past),
  // used to switch the deadline text to the urgent/error styling below.
  const isExpiringSoon = tender.submission_deadline
    ? (new Date(tender.submission_deadline).getTime() - Date.now()) < 3 * 86400000
    : false;

  return (
    // Card press -> fires onPress, which the caller wires up to navigate
    // to TenderDetailScreen (e.g. navigation.navigate('TenderDetail', { id: tender.id })).
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={2}>{tender.title}</Text>
        {save && <SaveJobButton noun="tender" {...save} />}
      </View>
      <Text style={styles.org}>{tender.organisation}</Text>
      <Text style={styles.state}>{tender.state}</Text>
      <View style={styles.footer}>
        <Badge label={tender.category} />
        {/* "Closed" for a saved tender whose bidding has ended; otherwise the deadline
            when the API gave one, in the urgent/error style when isExpiringSoon
            (deadline within 3 days or passed). */}
        {closed ? (
          <Text style={styles.closed}>Closed</Text>
        ) : deadline ? (
          <Text style={[styles.deadline, isExpiringSoon && styles.deadlineUrgent]}>
            Due: {deadline}
          </Text>
        ) : null}
      </View>
      {/* Estimated value is optional in the API — only shown when present.
          Converted from rupees to lakhs (÷100000) and shown as e.g. "Est. value: ₹5.0L". */}
      {tender.estimated_value && (
        <Text style={styles.value}>
          Est. value: ₹{(tender.estimated_value / 100000).toFixed(1)}L
        </Text>
      )}
    </TouchableOpacity>
  );
}

const makeStyles = (Colors: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing[4],
    marginBottom: Spacing[3],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing[2] },
  title: { flex: 1, fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.text },
  closed: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: Colors.textSecondary },
  org: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 4 },
  state: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing[3] },
  deadline: { fontSize: FontSize.xs, color: Colors.textSecondary },
  deadlineUrgent: { color: Colors.error, fontWeight: FontWeight.semibold },
  value: { fontSize: FontSize.xs, color: Colors.success, marginTop: Spacing[2], fontWeight: FontWeight.medium },
});
