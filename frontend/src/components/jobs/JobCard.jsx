/**
 * JobCard.jsx
 *
 * Renders a single private job listing as a clickable summary card (logo, title,
 * company, city, posted-time, salary range, job type badge, and an optional
 * save/bookmark toggle). Used anywhere a list of job listings is rendered, e.g.
 * the public Jobs listing page, saved-jobs pages, and search/alert result lists.
 * The whole card is a <Link> to the job detail page (/jobs/:id).
 */
import { Link } from 'react-router-dom'
import { MapPin, Clock, IndianRupee, Bookmark } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { formatSalaryRange } from '@/utils/formatCurrency'
import { timeAgo } from '@/utils/formatDate'
import { JOB_TYPES } from '@/utils/constants'

/**
 * JobCard
 *
 * Summary card for a single job listing, linking to its detail page.
 *
 * Props:
 * - job (object, required) — job record with fields: id, title, company_name,
 *   company_logo, city, created_at, salary_min, salary_max, job_type.
 * - isSaved (boolean, default false) — whether this job is currently in the
 *   viewer's saved jobs list; controls the bookmark icon's filled/outline state.
 * - onToggleSave (function, optional) — callback invoked with job.id when the
 *   bookmark button is clicked. When omitted, the bookmark button is not rendered
 *   at all (e.g. for anonymous/public views that don't support saving).
 * - isPending (boolean, default false) — disables the bookmark button while a
 *   save/unsave request is in flight, to prevent duplicate submissions.
 *
 * Used in job listing pages (public Jobs page, seeker Saved Jobs page, search
 * results, etc.) wherever a grid/list of job cards is rendered.
 */
export function JobCard({ job, isSaved = false, onToggleSave, isPending = false }) {
  // Resolve the human-readable label for the job's type code (e.g. 'full_time' -> 'Full-time'),
  // falling back to the raw value if it isn't found in the JOB_TYPES lookup.
  const typeLabel = JOB_TYPES.find(t => t.value === job.job_type)?.label ?? job.job_type

  // Handles clicks on the bookmark/save button. Since the button lives inside the
  // outer <Link>, we must stop the click from bubbling up (which would navigate to
  // the job detail page) and prevent the link's default navigation behavior.
  const handleSave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    onToggleSave?.(job.id)
  }

  return (
    <Link to={`/jobs/${job.id}`} className="block bg-white border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{job.title}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">{job.company_name}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Company logo is optional on the job record; only render if present */}
          {job.company_logo && (
            <img src={job.company_logo} alt={job.company_name} className="h-10 w-10 rounded-lg object-cover" />
          )}
          {/* Bookmark toggle only renders when a save handler is supplied by the caller */}
          {onToggleSave && (
            <button
              onClick={handleSave}
              disabled={isPending}
              title={isSaved ? 'Remove from saved' : 'Save job'}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
            >
              <Bookmark
                className={`h-5 w-5 transition-colors ${
                  isSaved ? 'fill-primary text-primary' : 'text-muted-foreground'
                }`}
              />
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.city}</span>
        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeAgo(job.created_at)}</span>
        {/* Salary range is only shown when at least one bound is present on the job */}
        {(job.salary_min || job.salary_max) && (
          <span className="flex items-center gap-1">
            <IndianRupee className="h-3 w-3" />{formatSalaryRange(job.salary_min, job.salary_max)}
          </span>
        )}
      </div>

      <div className="mt-3">
        <Badge variant="secondary">{typeLabel}</Badge>
      </div>
    </Link>
  )
}
