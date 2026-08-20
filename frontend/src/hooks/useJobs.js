/**
 * useJobs.js — Fetches and re-fetches the private job listing collection
 * whenever the active filter state changes.
 *
 * Reads/writes filter and result state from `jobStore` (Zustand) so
 * filters persist across navigation, and delegates the actual HTTP call
 * to `jobService`. Used by the public Jobs listing page.
 */
import { useEffect } from 'react'
import { useJobStore } from '@/store/jobStore'
import { jobService } from '@/services/jobService'

/**
 * Loads the job list matching the current filters and exposes loading
 * state plus filter/page setters. Re-fetches automatically whenever
 * `filters` (from the store) changes.
 *
 * @returns {{
 *   jobs: Array<object>,
 *   total: number,
 *   filters: object,
 *   loading: boolean,
 *   setFilters: (filters: object) => void,
 *   setPage: (page: number) => void
 * }} Job list state and filter/pagination controls.
 * Used by: pages/public/Jobs (listing + filter sidebar/pagination).
 */
export function useJobs() {
  const { jobs, total, filters, loading, setJobs, setFilters, setPage, setLoading } = useJobStore()

  useEffect(() => {
    setLoading(true)
    jobService.list(filters)
      .then(({ data }) => setJobs(data.results, data.count))
      .finally(() => setLoading(false))
  }, [filters])

  return { jobs, total, filters, loading, setFilters, setPage }
}
