/**
 * AlertMatches.jsx
 *
 * The open jobs a job alert matches — StepsDoor posts, company careers-page
 * openings and government jobs — newest first, each with a save toggle and an
 * apply / details link. Fetched from GET /api/alerts/{id}/matches/, or for all
 * of the seeker's active alerts at once from GET /api/alerts/matches/.
 *
 * Used by pages/seeker/Alerts.jsx (under each job alert, collapsible) and
 * pages/seeker/Overview.jsx ("Jobs matching your alerts", all alerts).
 * Links stay inside the student dashboard (/seeker/...). Save state comes from
 * the page (`saves` prop) so every list on a page shares it.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { seekerService } from '@/services/seekerService'
import { SaveJobButton } from '@/components/jobs/SaveJobButton'
import { timeAgo } from '@/utils/formatDate'

// Match kind -> short source label on each row.
const SOURCE = { job: 'StepsDoor', company: 'Company careers', govt: 'Govt job' }

/** "12 open jobs match: 5 on StepsDoor, 4 from company careers pages, 3 government". */
export function matchSummary({ count, counts }) {
  if (!count) return 'No open jobs match yet'
  const parts = [
    counts.job && `${counts.job} on StepsDoor`,
    counts.company && `${counts.company} from company careers pages`,
    counts.govt && `${counts.govt} government`,
  ].filter(Boolean)
  return `${count.toLocaleString('en-IN')} open job${count === 1 ? '' : 's'} match: ${parts.join(', ')}`
}

/**
 * One matching job: source label, title (opens the job's page), employer ·
 * location · posting age, save toggle and Apply link.
 */
function MatchRow({ job, save }) {
  // StepsDoor posts and govt jobs have detail pages; company jobs live on the company's site.
  const detailPath = job.kind === 'job' ? `/seeker/browse-jobs/${job.id}` : job.kind === 'govt' ? `/seeker/govt-jobs/${job.id}` : null
  const facts = [job.company, job.location, job.posted_at && timeAgo(job.posted_at)].filter(Boolean).join(' · ')
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{SOURCE[job.kind]}</p>
        {detailPath ? (
          <Link to={detailPath} className="text-sm font-medium text-foreground hover:text-primary line-clamp-1">{job.title}</Link>
        ) : (
          <a href={job.apply_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-foreground hover:text-primary line-clamp-1">{job.title}</a>
        )}
        <p className="text-xs text-muted-foreground line-clamp-1">{facts}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {save && <SaveJobButton {...save} />}
        <a href={job.apply_url} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted">
          Apply <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  )
}

/**
 * AlertMatches
 *
 * Props:
 * - alertId (number, optional) — list matches of this alert; omit for all active alerts.
 * - collapsible (boolean, default false) — start collapsed behind a "View jobs" toggle
 *   showing the match summary (Alerts page). When false the list is always shown.
 * - limit (number, default 20) — how many jobs to fetch (the summary counts all of them).
 * - reloadKey (any, optional) — change it to refetch (e.g. after the alert is edited).
 * - emptyText (string, optional) — shown when nothing matches.
 * - saves (object, required) — the page's `useSavedJobs()` result. The page owns it
 *   so several lists share one saved-jobs fetch and stay in sync.
 */
export function AlertMatches({ alertId, collapsible = false, limit = 20, reloadKey, emptyText, saves }) {
  const { isSaved, toggleSave, isPending, isSeeker } = saves
  const [data, setData] = useState(null) // last response: {count, counts, results}
  const [error, setError] = useState(false)
  const [open, setOpen] = useState(!collapsible)

  useEffect(() => {
    let cancelled = false
    const request = alertId ? seekerService.alertMatches(alertId, { limit }) : seekerService.allAlertMatches({ limit })
    request
      .then(({ data }) => { if (!cancelled) { setData(data); setError(false) } })
      .catch(() => { if (!cancelled) setError(true) })
    return () => { cancelled = true }
  }, [alertId, limit, reloadKey])

  if (error) return <p className="text-xs text-muted-foreground">Couldn&apos;t load matching jobs right now.</p>
  if (!data) return <p className="text-xs text-muted-foreground">Finding matching jobs…</p>

  const list = data.results.length === 0 ? (
    <p className="px-4 py-6 text-center text-sm text-muted-foreground">{emptyText || 'No open jobs match this alert yet. New matches appear here as jobs are added.'}</p>
  ) : (
    <div className="divide-y">
      {data.results.map(job => (
        <MatchRow
          key={`${job.kind}:${job.id}`}
          job={job}
          save={isSeeker ? { saved: isSaved(job.id, job.kind), pending: isPending(job.id, job.kind), onToggle: () => toggleSave(job.id, job.kind) } : null}
        />
      ))}
      {data.count > data.results.length && (
        <p className="px-4 py-2 text-xs text-muted-foreground">Showing the {data.results.length} newest of {data.count.toLocaleString('en-IN')}.</p>
      )}
    </div>
  )

  if (!collapsible) return list

  return (
    <div>
      <button type="button" onClick={() => setOpen(o => !o)} disabled={data.count === 0}
        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline disabled:text-muted-foreground disabled:no-underline">
        {matchSummary(data)}
        {data.count > 0 && (open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />)}
      </button>
      {open && data.count > 0 && <div className="mt-2 rounded-lg border bg-gray-50/50">{list}</div>}
    </div>
  )
}
