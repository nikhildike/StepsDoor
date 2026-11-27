/**
 * useSavedTenders.js — bookmarking tenders (the tender counterpart of useSavedJobs).
 *
 * Fetches the signed-in user's saved tenders once and exposes helpers to check
 * and toggle a tender's saved state, with per-tender in-flight tracking so a
 * double click can't send two requests. Tenders are members-only, so guests get
 * `canSave: false`.
 *
 * Used by components/tenders/LatestTenders (cards), pages/public/TenderDetail,
 * components/tenders/TenderAlertMatches and pages/seeker/Overview (alert matches).
 */
import { useCallback, useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { tenderService } from '@/services/tenderService'

/**
 * @returns {{
 *   canSave: boolean,
 *   isSaved: (tenderId: number) => boolean,
 *   isPending: (tenderId: number) => boolean,
 *   toggleSave: (tenderId: number) => Promise<void>,
 * }}
 */
export function useSavedTenders() {
  const { token, user } = useAuthStore()
  const canSave = !!token && !user?.is_company
  const [savedMap, setSavedMap] = useState({}) // tender id -> bookmark id
  const [pending, setPending] = useState(new Set()) // tender ids with a request in flight

  useEffect(() => {
    if (!canSave) return
    tenderService.saved()
      .then(({ data }) => {
        const map = {}
        ;(data.results ?? data).forEach(s => { map[s.tender] = s.id })
        setSavedMap(map)
      })
      .catch(() => {})
  }, [canSave])

  /** Whether the tender is in the user's saved list. */
  const isSaved = useCallback((id) => id in savedMap, [savedMap])
  /** Whether a save/unsave request for the tender is in flight. */
  const isPending = useCallback((id) => pending.has(id), [pending])

  /** Save the tender if it isn't saved, otherwise remove it (ignored while a request for it runs). */
  const toggleSave = useCallback(async (id) => {
    if (pending.has(id)) return
    setPending(prev => new Set(prev).add(id))
    try {
      if (savedMap[id]) {
        await tenderService.unsave(savedMap[id])
        setSavedMap(prev => {
          const next = { ...prev }
          delete next[id]
          return next
        })
      } else {
        const { data } = await tenderService.save(id)
        setSavedMap(prev => ({ ...prev, [id]: data.id }))
      }
    } catch {
      // leave the previous state; the user can try again
    } finally {
      setPending(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }, [savedMap, pending])

  return { canSave, isSaved, isPending, toggleSave }
}
