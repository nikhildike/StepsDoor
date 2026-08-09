import { Link } from 'react-router-dom'
import { MapPin, Clock, IndianRupee, Bookmark } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { formatSalaryRange } from '@/utils/formatCurrency'
import { timeAgo } from '@/utils/formatDate'
import { JOB_TYPES } from '@/utils/constants'

export function JobCard({ job, isSaved = false, onToggleSave, isPending = false }) {
  const typeLabel = JOB_TYPES.find(t => t.value === job.job_type)?.label ?? job.job_type

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
          {job.company_logo && (
            <img src={job.company_logo} alt={job.company_name} className="h-10 w-10 rounded-lg object-cover" />
          )}
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
