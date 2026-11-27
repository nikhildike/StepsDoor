/**
 * store/savedTendersStore.ts
 *
 * Which tenders the signed-in user has saved, shared app-wide (Zustand) so a
 * bookmark tapped on the Tenders tab shows as saved on Home, Alerts and the
 * Saved Tenders screen too. Maps tender id -> bookmark id. The tender
 * counterpart of `savedJobsStore.ts`; loaded/cleared by `hooks/useSavedTenders.ts`.
 */
import { create } from 'zustand';
import { tenderService, SavedTender } from '@/services/tenderService';

interface SavedTendersState {
  /** tender id -> bookmark id, for every saved tender. */
  saved: Record<number, number>;
  /** Tender ids with a save/unsave request in flight. */
  pending: Record<number, true>;
  /** Token the map was loaded for; null when not loaded / signed out. */
  loadedFor: string | null;
  /** Fetch the saved list for `token` (no-op if already loaded for it). */
  load: (token: string) => Promise<void>;
  /** Replace the map from a full saved list (e.g. after SavedTendersScreen fetched it). */
  setFromList: (list: SavedTender[]) => void;
  /** Save the tender if it isn't saved, otherwise remove it. Ignored while a request for it is pending. */
  toggle: (tenderId: number) => Promise<void>;
  /** Forget everything (sign-out). */
  clear: () => void;
}

/** Build the tender id -> bookmark id map from a saved list. */
const toMap = (list: SavedTender[]) => Object.fromEntries(list.map((s) => [s.tender, s.id])) as Record<number, number>;

export const useSavedTendersStore = create<SavedTendersState>((set, get) => ({
  saved: {},
  pending: {},
  loadedFor: null,

  load: async (token) => {
    if (get().loadedFor === token) return;
    set({ loadedFor: token });
    try {
      const { data } = await tenderService.saved();
      if (get().loadedFor === token) set({ saved: toMap(data.results ?? data) });
    } catch {
      if (get().loadedFor === token) set({ loadedFor: null }); // retry on the next screen that needs it
    }
  },

  setFromList: (list) => set({ saved: toMap(list) }),

  toggle: async (tenderId) => {
    if (get().pending[tenderId]) return;
    set((s) => ({ pending: { ...s.pending, [tenderId]: true } }));
    try {
      const bookmarkId = get().saved[tenderId];
      if (bookmarkId) {
        await tenderService.unsave(bookmarkId);
        set((s) => {
          const saved = { ...s.saved };
          delete saved[tenderId];
          return { saved };
        });
      } else {
        const { data } = await tenderService.save(tenderId);
        set((s) => ({ saved: { ...s.saved, [tenderId]: data.id } }));
      }
    } finally {
      set((s) => {
        const pending = { ...s.pending };
        delete pending[tenderId];
        return { pending };
      });
    }
  },

  clear: () => set({ saved: {}, pending: {}, loadedFor: null }),
}));
