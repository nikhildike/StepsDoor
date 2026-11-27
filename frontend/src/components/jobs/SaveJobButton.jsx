/**
 * SaveJobButton.jsx
 *
 * Bookmark toggle for job cards that aren't StepsDoor posts (which use the
 * button built into JobCard): company careers openings, govt jobs and alert
 * matches. Same look as JobCard's bookmark — filled when saved.
 *
 * Used by components/companies/LatestCompanyJobs, components/govtjobs/
 * LatestGovtJobs and components/alerts/AlertMatches, each wired to
 * `useSavedJobs().toggleSave(id, kind)`.
 */
import { Bookmark } from 'lucide-react'

/**
 * SaveJobButton
 *
 * Props:
 * - saved (boolean) — whether the job is in the seeker's saved list.
 * - pending (boolean) — disables the button while a save/unsave request runs.
 * - onToggle (function) — called on click; the click doesn't bubble, so the
 *   button can sit inside a clickable card or link.
 */
export function SaveJobButton({ saved, pending = false, onToggle }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle() }}
      disabled={pending}
      title={saved ? 'Remove from saved' : 'Save job'}
      aria-label={saved ? 'Remove from saved' : 'Save job'}
      aria-pressed={saved}
      className="shrink-0 p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
    >
      <Bookmark className={`h-5 w-5 transition-colors ${saved ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
    </button>
  )
}
