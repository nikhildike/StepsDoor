import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { govtJobService } from '@/services/govtJobService'
import { Spinner } from '@/components/ui/Spinner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ExternalLink, ArrowLeft, Calendar, MapPin, Users, GraduationCap, IndianRupee, Clock, Copy, Check, Hash } from 'lucide-react'

function formatDate(dateStr) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-0">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  )
}

function CopyBtn({ text, label }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm border border-border bg-muted hover:bg-muted/70 text-muted-foreground transition-colors"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copied!' : `Copy ${label}`}
    </button>
  )
}

const CATEGORIES = {
  civil_services: 'Civil Services', banking: 'Banking', railway: 'Railway',
  police: 'Police & Defence', teaching: 'Teaching', healthcare: 'Healthcare',
  psu: 'PSU', state_govt: 'State Government', other: 'Other',
}

export default function GovtJobDetail() {
  const { id } = useParams()
  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    govtJobService.get(id).then(({ data }) => setJob(data)).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="flex justify-center py-24"><Spinner /></div>
  if (!job) return <p className="text-center py-24 text-muted-foreground">Job not found.</p>

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/govt-jobs" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to Govt Jobs
      </Link>

      <div className="bg-white border rounded-lg p-8">
        {/* Title + copy actions */}
        <div className="mb-4">
          <Badge variant="secondary" className="mb-3">{CATEGORIES[job.category] ?? job.category}</Badge>
          <h1 className="text-xl font-bold text-foreground leading-snug">{job.title}</h1>
          <p className="text-base text-muted-foreground mt-1">{job.organisation}</p>

          {/* Job ID */}
          {job.job_id && (
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <Hash className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm font-mono text-muted-foreground">{job.job_id}</span>
            </div>
          )}

          {/* Copy buttons */}
          <div className="mt-3 flex flex-wrap gap-2">
            <CopyBtn text={job.title} label="Title" />
            {job.job_id && <CopyBtn text={job.job_id} label="Job ID" />}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-x-8 mt-6">
          <div>
            <InfoRow icon={MapPin} label="State / Level" value={job.state || 'Central Government'} />
            <InfoRow icon={Users} label="Total Vacancies" value={job.vacancy_count?.toLocaleString('en-IN')} />
            <InfoRow icon={Clock} label="Age Limit" value={job.age_limit} />
            <InfoRow icon={GraduationCap} label="Qualification" value={job.qualification} />
            <InfoRow icon={IndianRupee} label="Pay Scale / Salary" value={job.salary_range} />
          </div>
          <div>
            <InfoRow icon={Calendar} label="Notification Date" value={formatDate(job.published_at)} />
            <InfoRow icon={Calendar} label="Application Start" value={formatDate(job.application_start)} />
            <InfoRow icon={Calendar} label="Last Date to Apply" value={formatDate(job.application_deadline)} />
            <InfoRow icon={Calendar} label="Exam Date" value={formatDate(job.exam_date)} />
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button href={job.source_url} target="_blank" rel="noopener noreferrer">
            Apply on Official Portal <ExternalLink className="h-4 w-4" />
          </Button>
          {job.notification_pdf_url && (
            <Button variant="outline" href={job.notification_pdf_url} target="_blank" rel="noopener noreferrer">
              Download Notification <ExternalLink className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <p className="mt-6 text-xs text-muted-foreground text-center">
        This notification was sourced from <strong>{job.source_portal}</strong>.
        Linksdoor is not affiliated with any government body. Verify all details on the official recruitment portal before applying.
      </p>
    </div>
  )
}
