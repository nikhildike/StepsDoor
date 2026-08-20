/**
 * hooks/useJobs.ts
 *
 * Screen-facing hook for the Jobs tab: fetches the private job listing
 * results whenever the active filters (in `jobStore`) change, and exposes
 * the loaded jobs plus filter setters to the UI. Used by the Jobs list
 * screen (and its filter/search UI).
 */
import { useEffect } from 'react';
import { useJobStore } from '@/store/jobStore';
import { jobService } from '@/services/jobService';

/**
 * Fetches job listings matching the current `jobStore` filters and
 * refetches automatically whenever those filters change (search, city,
 * job_type, or page).
 *
 * @returns `{ jobs, total, filters, loading, setFilters, setPage }` —
 *   the current job list/total/loading state from the store, plus
 *   setters for updating filters or pagination.
 * @remarks Used by the Jobs list screen to drive its list rendering,
 *   search/filter inputs, and pagination controls.
 */
export function useJobs() {
  const { jobs, total, filters, loading, setJobs, setFilters, setPage, setLoading } = useJobStore();

  // Refetch whenever `filters` changes (search text, city, job_type, or
  // page). Errors are swallowed here (silently leaves the previous job
  // list in place) — screens relying on this hook should still surface
  // their own error/empty states as needed.
  useEffect(() => {
    setLoading(true);
    jobService
      .list(filters)
      .then(({ data }) => setJobs(data.results, data.count))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filters]);

  return { jobs, total, filters, loading, setFilters, setPage };
}
