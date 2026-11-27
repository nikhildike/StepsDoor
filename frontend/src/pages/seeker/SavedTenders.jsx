/**
 * Saved Tenders page.
 *
 * Route: `/seeker/saved-tenders` (nested under the seeker account layout; in the
 * contractor sidebar as "Saved Tenders"). Access: any signed-in user.
 *
 * Lists the tenders the user bookmarked (GET /api/tenders/saved/), newest first,
 * as TenderRow cards: tap to open the tender, the bookmark to remove it. Tenders
 * whose bidding has ended stay listed, marked "Closed". The tender counterpart
 * of pages/seeker/SavedJobs.jsx.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bookmark } from 'lucide-react'
import { tenderService } from '@/services/tenderService'
import { TenderRow } from '@/components/tenders/LatestTenders'

/** Renders the user's saved tenders with remove toggles. */
export default function SavedTenders() {
  const [saved, setSaved] = useState([])     // [{id, tender, saved_at, is_open, details}]
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState(new Set()) // bookmark ids being removed

  useEffect(() => {
    tenderService.saved()
      .then(({ data }) => setSaved(data.results ?? data))
      .catch(() => setSaved([]))
      .finally(() => setLoading(false))
  }, [])

  /** Remove a bookmark (DELETE /tenders/saved/:id/) and drop it from the list. */
  const remove = async (s) => {
    if (removing.has(s.id)) return
    setRemoving(prev => new Set(prev).add(s.id))
    try {
      await tenderService.unsave(s.id)
      setSaved(prev => prev.filter(x => x.id !== s.id))
    } finally {
      setRemoving(prev => {
        const next = new Set(prev)
        next.delete(s.id)
        return next
      })
    }
  }

  if (loading) return <div className="text-muted-foreground">Loading...</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Saved Tenders</h1>
        <p className="text-muted-foreground mt-1">{saved.length} saved tender{saved.length !== 1 ? 's' : ''}</p>
      </div>

      {saved.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-12 text-center text-muted-foreground">
          <Bookmark className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No saved tenders yet</p>
          <p className="text-sm mt-1">Tap the bookmark on any tender to keep it here while you prepare your bid.</p>
          <Link to="/seeker/tenders" className="text-primary text-sm hover:underline mt-3 inline-block">Browse tenders →</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {saved.map(s => (
            <TenderRow
              key={s.id}
              tender={s.details}
              prefix="/seeker"
              closed={!s.is_open}
              save={{ saved: true, pending: removing.has(s.id), onToggle: () => remove(s) }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
