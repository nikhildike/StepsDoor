import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/store/authStore'
import { seekerService } from '@/services/seekerService'

/**
 * Tracks which jobs the current seeker has saved.
 * savedMap: { job_post_id -> saved_job_id }
 * Only fetches when the user is a logged-in job seeker.
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

  const isSaved = useCallback((jobId) => jobId in savedMap, [savedMap])

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
