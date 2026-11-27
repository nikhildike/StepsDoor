/**
 * hooks/useSavedJobs.ts
 *
 * Save/unsave any job from a card. Reads the app-wide `savedJobsStore`, loading
 * it once per signed-in user (and clearing it on sign-out). Company accounts
 * don't save jobs, so `canSave` is false for them and for guests.
 *
 * Used by the Jobs segment (StepsDoor and govt job cards), the company
 * openings section, alert matches, and SavedJobsScreen. Mirrors the web
 * `frontend/src/hooks/useSavedJobs.js` (`kind` defaults to 'job').
 */
import { useCallback, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { savedKey, useSavedJobsStore } from '@/store/savedJobsStore';
import { JobKind } from '@/services/seekerService';

/**
 * @returns `{ canSave, isSaved(id, kind), isPending(id, kind), toggleSave(id, kind) }`.
 */
export function useSavedJobs() {
  const { token, user } = useAuthStore();
  const { saved, pending, load, toggle, clear } = useSavedJobsStore();
  const canSave = !!token && !user?.is_company;

  // Load the saved list for this user; forget it when they sign out.
  useEffect(() => {
    if (canSave && token) load(token);
    else if (!token) clear();
  }, [canSave, token, load, clear]);

  /** Whether the job is in the seeker's saved list. */
  const isSaved = useCallback((id: number, kind: JobKind = 'job') => savedKey(id, kind) in saved, [saved]);
  /** Whether a save/unsave request for the job is in flight. */
  const isPending = useCallback((id: number, kind: JobKind = 'job') => !!pending[savedKey(id, kind)], [pending]);
  /** Save or unsave the job; errors leave the previous state. */
  const toggleSave = useCallback((id: number, kind: JobKind = 'job') => toggle(id, kind).catch(() => {}), [toggle]);

  return { canSave, isSaved, isPending, toggleSave };
}
