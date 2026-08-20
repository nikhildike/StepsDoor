/**
 * store/jobStore.ts
 *
 * Zustand store holding the private job listings currently loaded on the
 * Jobs tab plus the active search/filter state driving that list. Unlike
 * `authStore.ts`, nothing here is persisted to AsyncStorage — filters and
 * results reset each time the app restarts, which matches this store's
 * mirror in the web app (`frontend/src/store/jobStore.js`, filter state
 * only, no persistence).
 *
 * Consumed by `hooks/useJobs.ts`, which fetches from `jobService` whenever
 * `filters` changes and writes the results back in here; and by the Jobs
 * list/detail screens for rendering and filter UI.
 */
import { create } from 'zustand';

// Shape of a single private job listing as returned by the backend's
// `jobs` app (matches `frontend`'s job shape).
interface Job {
  id: number;
  title: string;
  company_name: string;
  company_logo?: string;
  city: string;
  state: string;
  job_type: string;
  salary_min?: number;
  salary_max?: number;
  redirect_url: string;
  created_at: string;
  description?: string;
}

// Current search/filter/pagination criteria applied to the job list.
interface Filters {
  search: string;
  city: string;
  job_type: string;
  page: number;
}

interface JobState {
  /** Jobs currently loaded for the active `filters`/page. Replaced (not appended) on each successful fetch. */
  jobs: Job[];
  /** Total number of jobs matching the current filters across all pages (from the backend's paginated `count`), used for pagination UI. */
  total: number;
  /** Active search/city/job_type/page filter criteria driving the current `jobs` fetch. */
  filters: Filters;
  /** Whether a job list fetch is currently in flight — drives loading spinners on the Jobs list screen. */
  loading: boolean;
  /** Replaces the loaded jobs and total count, typically called after a successful `jobService.list()` fetch. */
  setJobs: (jobs: Job[], total: number) => void;
  /** Merges partial filter changes into the current filters and resets to page 1 (any filter change implies a fresh search). */
  setFilters: (filters: Partial<Filters>) => void;
  /** Updates only the page number within the current filters, for pagination without resetting other filter criteria. */
  setPage: (page: number) => void;
  /** Toggles the loading flag around fetch calls. */
  setLoading: (loading: boolean) => void;
}

export const useJobStore = create<JobState>((set) => ({
  // Initial state: no jobs loaded yet, default (empty) filters, page 1,
  // not loading. Nothing here is read from AsyncStorage — this store
  // starts fresh on every app launch.
  jobs: [],
  total: 0,
  filters: { search: '', city: '', job_type: '', page: 1 },
  loading: false,
  // Action: overwrites the job list/total with fresh fetch results.
  setJobs: (jobs, total) => set({ jobs, total }),
  // Action: shallow-merges new filter values over the existing filters
  // and forces `page` back to 1, since changing search/city/job_type
  // criteria should restart pagination from the first page.
  setFilters: (filters) =>
    set((s) => ({ filters: { ...s.filters, ...filters, page: 1 } })),
  // Action: advances/changes only the page number, leaving other filter
  // criteria (search/city/job_type) untouched — used for "load more"/
  // pagination controls.
  setPage: (page) => set((s) => ({ filters: { ...s.filters, page } })),
  // Action: flips the loading flag; called around `jobService.list()`
  // calls in `hooks/useJobs.ts`.
  setLoading: (loading) => set({ loading }),
}));
