/**
 * TenderAlertMatches.jsx
 *
 * The open tenders a tender alert matches, soonest closing first, each as a
 * TenderRow card with a bookmark toggle — the tender counterpart of
 * components/alerts/AlertMatches. Fetched from GET /api/tenders/alerts/{id}/matches/,
 * or for all active alerts at once from GET /api/tenders/alerts/matches/.
 *
 * Used by pages/seeker/Alerts.jsx (under each tender alert, collapsible) and the
 * contractor dashboard in pages/seeker/Overview.jsx ("Tenders matching your
 * alerts"). Links stay inside the dashboard (/seeker/tenders/:id).
 */
import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { tenderService } from '@/services/tenderService'
import { TenderRow } from '@/components/tenders/LatestTenders'

/** "4 open tenders match" / "No open tenders match yet". */
export function tenderMatchSummary(count) {
  if (!count) return 'No open tenders match yet'
  return `${count.toLocaleString('en-IN')} open tender${count === 1 ? '' : 's'} match`
}

/**
 * TenderAlertMatches
 *
 * Props:
 * - alertId (number, optional) — list matches of this alert; omit for all active alerts.
 * - collapsible (boolean, default false) — start collapsed behind the summary (Alerts page).
 * - limit (number, default 20) — how many tenders to fetch (the summary counts all).
 * - emptyText (string, optional) — shown when nothing matches.
 * - saves (object, required) — the page's `useSavedTenders()` result, shared by every list.
 */
export function TenderAlertMatches({ alertId, collapsible = false, limit = 20, emptyText, saves }) {
  const { canSave, isSaved, isPending, toggleSave } = saves
  const [data, setData] = useState(null) // last response: {count, results}
  const [error, setError] = useState(false)
  const [open, setOpen] = useState(!collapsible)

  useEffect(() => {
    let cancelled = false
    const request = alertId ? tenderService.alertMatches(alertId, { limit }) : tenderService.allAlertMatches({ limit })
    request
      .then(({ data }) => { if (!cancelled) { setData(data); setError(false) } })
      .catch(() => { if (!cancelled) setError(true) })
    return () => { cancelled = true }
  }, [alertId, limit])

  if (error) return <p className="text-xs text-muted-foreground">Couldn&apos;t load matching tenders right now.</p>
  if (!data) return <p className="text-xs text-muted-foreground">Finding matching tenders…</p>

  const list = data.results.length === 0 ? (
    <p className="px-4 py-6 text-center text-sm text-muted-foreground">{emptyText || 'No open tenders match this alert yet. New matches appear here as tenders are published.'}</p>
  ) : (
    <div className="space-y-2 p-2">
      {data.results.map(t => (
        <TenderRow
          key={t.id}
          tender={t}
          prefix="/seeker"
          save={canSave ? { saved: isSaved(t.id), pending: isPending(t.id), onToggle: () => toggleSave(t.id) } : null}
        />
      ))}
      {data.count > data.results.length && (
        <p className="px-2 text-xs text-muted-foreground">Showing the {data.results.length} closing soonest of {data.count.toLocaleString('en-IN')}.</p>
      )}
    </div>
  )

  if (!collapsible) return list

  return (
    <div>
      <button type="button" onClick={() => setOpen(o => !o)} disabled={data.count === 0}
        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline disabled:text-muted-foreground disabled:no-underline">
        {tenderMatchSummary(data.count)}
        {data.count > 0 && (open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />)}
      </button>
      {open && data.count > 0 && <div className="mt-2 rounded-lg border bg-gray-50/50">{list}</div>}
    </div>
  )
}
