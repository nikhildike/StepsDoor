/**
 * useSavedJobs.js — Job seeker "saved jobs" bookmarking hook.
 *
 * Fetches the seeker's saved-job list on mount (seeker accounts only)
 * and exposes helpers to check/toggle the saved state of an individual
 * job, with per-job in-flight tracking to prevent duplicate requests.
 *
 * Used by job listing/detail UI (save/bookmark button) and by the
 * seeker's SavedJobs page.
 */
import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/store/authStore'
import { seekerService } from '@/services/seekerService'

/**
 * Tracks which jobs the current seeker has saved.
 * savedMap: { job_post_id -> saved_job_id }
 * Only fetches when the user is a logged-in job seeker.
 *
 * @returns {{
 *   isSaved: (jobId: string|number) => boolean,
 *   toggleSave: (jobId: string|number) => Promise<void>,
 *   isSeeker: boolean,
 *   pending: Set<string|number>
 * }} Saved-jobs lookup/toggle API plus seeker-role and pending-request state.
 * Used by: pages/public/Jobs, pages/public/JobDetail (save button),
 * pages/seeker/SavedJobs.
 */
export function useSavedJobs() {
  const { user, token } = useAuthStore()
  const [savedMap, setSavedMap] = useState({})
  const [pending, setPending] = useState(new Set())

  const isSeeker = !!(token && user && !user.is_company)

  useEffect(() => {
    if (!isSeeker) return
    seekerService.savedJobs()
      .then(({ data }) => {
        const list = data.results ?? data
        const map = {}
        list.forEach(s => { map[s.job_post] = s.id })
        setSavedMap(map)
      })
      .catch(() => {})
  }, [isSeeker])

  /**
   * Returns whether the given job is currently saved by the seeker.
   * @param {string|number} jobId - The job post ID to check.
   * @returns {boolean} True if the job is in the saved map.
   */
  const isSaved = useCallback((jobId) => jobId in savedMap, [savedMap])

  /**
   * Toggles the saved state of a job: unsaves it if already saved
   * (DELETE via `unsaveJob`), otherwise saves it (POST via `saveJob`).
   * Guards against duplicate/overlapping requests for the same job via
   * the `pending` set, and updates `savedMap` optimistically once the
   * request resolves.
   * @param {string|number} jobId - The job post ID to save/unsave.
   * @returns {Promise<void>}
   */
  const toggleSave = useCallback(async (jobId) => {
    if (pending.has(jobId)) return
    setPending(prev => new Set(prev).add(jobId))
    try {
      if (savedMap[jobId]) {
        await seekerService.unsaveJob(savedMap[jobId])
        setSavedMap(prev => {
          const next = { ...prev }
          delete next[jobId]
          return next
        })
      } else {
        const { data } = await seekerService.saveJob(jobId)
        setSavedMap(prev => ({ ...prev, [jobId]: data.id }))
      }
    } finally {
      setPending(prev => {
        const next = new Set(prev)
        next.delete(jobId)
        return next
      })
    }
  }, [savedMap, pending])

  return { isSaved, toggleSave, isSeeker, pending }
}
