/**
 * store/savedJobsStore.ts
 *
 * Which jobs the signed-in seeker has saved, shared app-wide (Zustand) so a
 * bookmark tapped on one tab shows as saved everywhere — Jobs list, company
 * openings, alert matches and the Saved Jobs screen. Keys are 'kind:id'
 * ('job:12', 'company:7', 'govt:3') because three job sources can be saved.
 *
 * Not persisted: `hooks/useSavedJobs.ts` loads it from the API once per
 * signed-in token and clears it on sign-out.
 */
import { create } from 'zustand';
import { seekerService, JobKind, SavedJob, SAVED_ID_FIELD } from '@/services/seekerService';

/** Map key for a job of a given kind. */
export const savedKey = (id: number, kind: JobKind) => `${kind}:${id}`;

interface SavedJobsState {
  /** 'kind:id' -> bookmark id, for every saved job. */
  saved: Record<string, number>;
  /** Keys with a save/unsave request in flight (their buttons are disabled). */
  pending: Record<string, true>;
  /** Token the `saved` map was loaded for; null when not loaded / signed out. */
  loadedFor: string | null;
  /** Fetch the saved list for `token` (no-op if already loaded for it). */
  load: (token: string) => Promise<void>;
  /** Replace the map from a full saved-jobs list (e.g. after SavedJobsScreen fetched it). */
  setFromList: (list: SavedJob[]) => void;
  /** Save the job if it isn't saved, otherwise remove it. Ignored while a request for it is pending. */
  toggle: (id: number, kind: JobKind) => Promise<void>;
  /** Forget everything (sign-out). */
  clear: () => void;
}

/** Build the 'kind:id' -> bookmark id map from a saved-jobs list. */
function toMap(list: SavedJob[]): Record<string, number> {
  const map: Record<string, number> = {};
  list.forEach((s) => {
    const jobId = s[SAVED_ID_FIELD[s.kind]];
    if (jobId != null) map[savedKey(jobId, s.kind)] = s.id;
  });
  return map;
}

export const useSavedJobsStore = create<SavedJobsState>((set, get) => ({
  saved: {},
  pending: {},
  loadedFor: null,

  load: async (token) => {
    if (get().loadedFor === token) return;
    set({ loadedFor: token });
    try {
      const { data } = await seekerService.savedJobs();
      if (get().loadedFor === token) set({ saved: toMap(data.results ?? data) });
    } catch {
      if (get().loadedFor === token) set({ loadedFor: null }); // retry on the next screen that needs it
    }
  },

  setFromList: (list) => set({ saved: toMap(list) }),

  toggle: async (id, kind) => {
    const key = savedKey(id, kind);
    if (get().pending[key]) return;
    set((s) => ({ pending: { ...s.pending, [key]: true } }));
    try {
      const bookmarkId = get().saved[key];
      if (bookmarkId) {
        await seekerService.unsaveJob(bookmarkId);
        set((s) => {
          const saved = { ...s.saved };
          delete saved[key];
          return { saved };
        });
      } else {
        const { data } = await seekerService.saveJob(id, kind);
        set((s) => ({ saved: { ...s.saved, [key]: data.id } }));
      }
    } finally {
      set((s) => {
        const pending = { ...s.pending };
        delete pending[key];
        return { pending };
      });
    }
  },

  clear: () => set({ saved: {}, pending: {}, loadedFor: null }),
}));
