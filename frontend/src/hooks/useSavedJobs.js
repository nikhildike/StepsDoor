/**
 * useSavedJobs.js — Job seeker "saved jobs" bookmarking hook.
 *
 * Fetches the seeker's saved-job list on mount (seeker accounts only) and
 * exposes helpers to check/toggle the saved state of any job, with per-job
 * in-flight tracking to prevent duplicate requests.
 *
 * A job is identified by its id plus its kind, because three sources can be
 * saved: 'job' (StepsDoor post — the default, so older callers pass just the
 * id), 'company' (company careers-page opening) and 'govt' (government job).
 *
 * Used by: pages/public/Jobs, pages/public/JobDetail (StepsDoor posts),
 * components/companies/LatestCompanyJobs (company jobs),
 * components/govtjobs/LatestGovtJobs (govt jobs) and
 * components/alerts/AlertMatches (jobs matching an alert).
 */
import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/store/authStore'
import { seekerService } from '@/services/seekerService'

// Saved-job record field holding the job's id, per kind (backend SavedJob model).
const ID_FIELD = { job: 'job_post', company: 'career_job', govt: 'govt_job' }

/** Map key for a job: 'job:12', 'company:7', 'govt:3'. */
const keyOf = (id, kind) => `${kind}:${id}`

/**
 * Tracks which jobs the current seeker has saved.
 * savedMap: { 'kind:id' -> saved-job record id }
 * Only fetches when the user is a logged-in non-company account.
 *
 * @returns {{
 *   isSaved: (id: number, kind?: 'job'|'company'|'govt') => boolean,
 *   toggleSave: (id: number, kind?: 'job'|'company'|'govt') => Promise<void>,
 *   isPending: (id: number, kind?: 'job'|'company'|'govt') => boolean,
 *   isSeeker: boolean,
 * }}
 */
export function useSavedJobs() {
  const { user, token } = useAuthStore()
  const [savedMap, setSavedMap] = useState({})
  const [pending, setPending] = useState(new Set()) // keys with a save/unsave request in flight

  const isSeeker = !!(token && user && !user.is_company)

  useEffect(() => {
    if (!isSeeker) return
    seekerService.savedJobs()
      .then(({ data }) => {
        const map = {}
        ;(data.results ?? data).forEach(s => { map[keyOf(s[ID_FIELD[s.kind]], s.kind)] = s.id })
        setSavedMap(map)
      })
      .catch(() => {})
  }, [isSeeker])

  /** Whether the job is in the seeker's saved list. */
  const isSaved = useCallback((id, kind = 'job') => keyOf(id, kind) in savedMap, [savedMap])

  /** Whether a save/unsave request for the job is still in flight. */
  const isPending = useCallback((id, kind = 'job') => pending.has(keyOf(id, kind)), [pending])

  /**
   * Saves the job if it isn't saved, otherwise removes it. Ignores the call
   * while a request for the same job is in flight; updates `savedMap` once
   * the request succeeds.
   */
  const toggleSave = useCallback(async (id, kind = 'job') => {
    const key = keyOf(id, kind)
    if (pending.has(key)) return
    setPending(prev => new Set(prev).add(key))
    try {
      if (savedMap[key]) {
        await seekerService.unsaveJob(savedMap[key])
        setSavedMap(prev => {
          const next = { ...prev }
          delete next[key]
          return next
        })
      } else {
        const { data } = await seekerService.saveJob(id, kind)
        setSavedMap(prev => ({ ...prev, [key]: data.id }))
      }
    } finally {
      setPending(prev => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
  }, [savedMap, pending])

  return { isSaved, toggleSave, isPending, isSeeker }
}
