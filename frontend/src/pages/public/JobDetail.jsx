import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { MapPin, Clock, IndianRupee, ExternalLink, Bookmark, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { jobService } from '@/services/jobService'
import { useSavedJobs } from '@/hooks/useSavedJobs'
import { useAuthStore } from '@/store/authStore'
import { formatSalaryRange } from '@/utils/formatCurrency'
import { formatDate } from '@/utils/formatDate'
import { JOB_TYPES } from '@/utils/constants'

export default function JobDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { token } = useAuthStore()
  const { isSaved, toggleSave, isSeeker, pending } = useSavedJobs()

  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)

  useEffect(() => {
    jobService.get(id).then(({ data }) => setJob(data)).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="flex justify-center py-24"><Spinner /></div>
  if (!job) return <p className="text-center py-24 text-muted-foreground">Job not found.</p>

  const typeLabel = JOB_TYPES.find(t => t.value === job.job_type)?.label ?? job.job_type
  const jobId = parseInt(id)

  const handleApply = async () => {
    setApplying(true)
    try {
      const { data } = await jobService.trackClick(jobId)
      window.open(data.redirect_url, '_blank', 'noopener,noreferrer')
    } catch {
      window.open(job.redirect_url, '_blank', 'noopener,noreferrer')
    } finally {
      setApplying(false)
    }
  }

  const handleSave = () => {
    if (!token) { navigate('/login'); return }
    if (!isSeeker) return
    toggleSave(jobId)
  }

  const saved = isSeeker && isSaved(jobId)

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white border border-border rounded-xl p-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold">{job.title}</h1>
            <p className="text-lg text-muted-foreground mt-1">{job.company_name}</p>
          </div>
          {job.company_logo && (
            <img src={job.company_logo} alt={job.company_name} className="h-16 w-16 rounded-xl object-cover shrink-0" />
          )}
        </div>

        {/* Meta */}
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{job.location}</span>
          <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />Posted {formatDate(job.created_at)}</span>
          {(job.salary_min || job.salary_max) && (
            <span className="flex items-center gap-1.5">
              <IndianRupee className="h-4 w-4" />{formatSalaryRange(job.salary_min, job.salary_max)}
            </span>
          )}
          {job.expires_at && (
            <span className="text-orange-600">Closes {formatDate(job.expires_at)}</span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary">{typeLabel}</Badge>
          <Badge variant="outline">{job.city}</Badge>
        </div>

        {/* Career page link */}
        {job.company_slug && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4 shrink-0" />
            <span>More from this company:</span>
            <Link to={`/careers/${job.company_slug}`} className="text-primary hover:underline">
              View all open positions →
            </Link>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-3 pt-2">
          <Button size="lg" onClick={handleApply} disabled={applying}>
            {applying ? 'Opening...' : 'Apply Now'} <ExternalLink className="h-4 w-4" />
          </Button>
          <button
            onClick={handleSave}
            disabled={pending.has(jobId)}
            title={saved ? 'Remove from saved' : 'Save job'}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors disabled:opacity-50 ${
              saved
                ? 'bg-primary/10 border-primary text-primary'
                : 'border-border hover:bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            <Bookmark className={`h-4 w-4 ${saved ? 'fill-primary' : ''}`} />
            {saved ? 'Saved' : 'Save Job'}
          </button>
        </div>

        {!token && (
          <p className="text-xs text-muted-foreground">
            <button onClick={() => navigate('/login')} className="text-primary hover:underline">Sign in</button>
            {' '}to save this job
          </p>
        )}

        {/* Description */}
        <div className="border-t pt-6">
          <h2 className="font-semibold mb-4">Job Description</h2>
          <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
            {job.description}
          </div>
        </div>

        {/* Apply again at bottom */}
        <div className="border-t pt-6">
          <Button size="lg" onClick={handleApply} disabled={applying}>
            {applying ? 'Opening...' : 'Apply Now'} <ExternalLink className="h-4 w-4" />
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            You'll be redirected to {job.company_name}'s careers page to complete your application.
          </p>
        </div>
      </div>
    </div>
  )
}
