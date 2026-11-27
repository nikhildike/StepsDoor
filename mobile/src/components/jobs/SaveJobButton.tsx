/**
 * components/jobs/SaveJobButton.tsx
 *
 * Bookmark toggle for any job card: filled when saved, outline when not.
 * Used by JobCard (StepsDoor posts), the Jobs segment's govt job cards,
 * CompanyOpeningsSection (company jobs), AlertMatchesList and SavedJobsScreen,
 * each wired to `useSavedJobs().toggleSave(id, kind)`. Mirrors the web
 * `frontend/src/components/jobs/SaveJobButton.jsx`.
 */
import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/theme/colors';

/**
 * Props for `SaveJobButton`.
 * - `saved`: whether the job is in the seeker's saved list.
 * - `pending`: disables the button while a save/unsave request runs.
 * - `onToggle`: called on press. The press doesn't reach a parent card's onPress.
 * - `noun`: what's being saved, for the accessibility label ("Save tender"); default 'job'.
 */
interface Props {
  saved: boolean;
  pending?: boolean;
  onToggle: () => void;
  noun?: string;
}

/** SaveJobButton — see `Props`. Also used on tender cards (`noun="tender"`). */
export function SaveJobButton({ saved, pending = false, onToggle, noun = 'job' }: Props) {
  const Colors = useThemeColors();
  return (
    <TouchableOpacity
      onPress={onToggle}
      disabled={pending}
      hitSlop={10}
      style={[styles.button, pending && styles.pending]}
      accessibilityRole="button"
      accessibilityLabel={saved ? 'Remove from saved' : `Save ${noun}`}
      accessibilityState={{ selected: saved, disabled: pending }}
    >
      <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={20} color={saved ? Colors.primary : Colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: { padding: 2 },
  pending: { opacity: 0.5 },
});
