/**
 * hooks/useSavedTenders.ts
 *
 * Save/unsave tenders from any card. Reads the app-wide `savedTendersStore`,
 * loading it once per signed-in user and clearing it on sign-out. Tenders are
 * members-only, so guests (and company accounts) get `canSave: false`.
 *
 * Used by TendersScreen, TenderDetailScreen, the Home tab (search results,
 * contractor feed, ContractorSummary), AlertsScreen's tender matches and
 * SavedTendersScreen. The tender counterpart of `useSavedJobs.ts`.
 */
import { useCallback, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useSavedTendersStore } from '@/store/savedTendersStore';

/** @returns `{ canSave, isSaved(id), isPending(id), toggleSave(id) }`. */
export function useSavedTenders() {
  const { token, user } = useAuthStore();
  const { saved, pending, load, toggle, clear } = useSavedTendersStore();
  const canSave = !!token && !user?.is_company;

  // Load the saved list for this user; forget it when they sign out.
  useEffect(() => {
    if (canSave && token) load(token);
    else if (!token) clear();
  }, [canSave, token, load, clear]);

  /** Whether the tender is in the user's saved list. */
  const isSaved = useCallback((id: number) => id in saved, [saved]);
  /** Whether a save/unsave request for the tender is in flight. */
  const isPending = useCallback((id: number) => !!pending[id], [pending]);
  /** Save or unsave the tender; errors leave the previous state. */
  const toggleSave = useCallback((id: number) => toggle(id).catch(() => {}), [toggle]);

  return { canSave, isSaved, isPending, toggleSave };
}
