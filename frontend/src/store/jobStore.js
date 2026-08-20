/**
 * State slice: Job listing filters — holds the public job listing page's
 * current result set, total count, active filters, and loading flag. Not
 * persisted (plain `create`, no `zustand/persist`) — filters reset on page
 * reload. Paired with `services/jobService.js` (`list`), whose `params` are
 * typically sourced from this store's `filters`. A parallel
 * `mobile/src/store/jobStore.ts` exists for the Expo app's Jobs/Search tabs.
 */
import { create } from 'zustand'

export const useJobStore = create((set) => ({
  // Current page of job results returned by jobService.list(). Starts empty
  // until the first fetch completes. Read by `pages/public/Jobs.jsx` to
  // render the listing.
  jobs: [],
  // Total number of jobs matching the current filters (for pagination UI),
  // separate from `jobs.length` (which is just the current page's size).
  // Starts at 0 until the first fetch completes.
  total: 0,
  // Active filter/search/pagination criteria sent to jobService.list().
  // Initialized to "no filters, page 1" so the first load fetches an
  // unfiltered first page.
  filters: { city: '', job_type: '', search: '', page: 1 },
  // Whether a jobs fetch is currently in flight, so the UI can show a
  // loading indicator. Starts false.
  loading: false,
  /**
   * Stores a freshly-fetched page of jobs and the matching total count.
   * Called by: `pages/public/Jobs.jsx` after `jobService.list()` resolves.
   */
  setJobs: (jobs, total) => set({ jobs, total }),
  /**
   * Merges new filter values into the existing filters and resets `page`
   * back to 1 — any change to city/job_type/search should restart pagination
   * from the first page rather than staying on a now-mismatched page number.
   * Called by: filter controls on `pages/public/Jobs.jsx` (search box, city
   * dropdown, job type dropdown).
   */
  setFilters: (filters) => set((s) => ({ filters: { ...s.filters, ...filters, page: 1 } })),
  /**
   * Updates only the `page` field of filters, leaving other filter values
   * untouched. Kept separate from setFilters because pagination shouldn't
   * reset itself back to page 1.
   * Called by: pagination controls on `pages/public/Jobs.jsx`.
   */
  setPage: (page) => set((s) => ({ filters: { ...s.filters, page } })),
  /**
   * Toggles the loading flag around a jobs fetch.
   * Called by: `pages/public/Jobs.jsx` before/after calling `jobService.list()`.
   */
  setLoading: (loading) => set({ loading }),
}))
