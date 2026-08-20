/**
 * CompanyCareers.jsx
 *
 * Public, branded "careers page" for a single subscribed company. Mounted
 * at `/careers/:slug` (see App.jsx) — this is the page StepsDoor gives each
 * paying company subscription (see CLAUDE.md `subscriptions`/`companies`
 * apps) so job seekers land somewhere company-specific rather than the
 * generic Jobs listing. Fetches the company profile + its open jobs in one
 * call via `companyService.careers(slug)`.
 */
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { MapPin, Briefcase, ExternalLink, Globe } from 'lucide-react'
import { companyService } from '@/services/companyService'
import { jobService } from '@/services/jobService'

// Job type value -> display label (mirrors the backend Job.job_type choices)
const JOB_TYPE_LABELS = {
  full_time: 'Full Time',
  part_time: 'Part Time',
  contract: 'Contract',
  internship: 'Internship',
}

// One open-position card on the company's careers page, with an Apply button.
function JobCard({ job }) {
  // Apply click handler — logs the click via jobService.trackClick (for the
  // company's analytics dashboard) then opens the redirect URL; falls back
  // to the job's own redirect_url if tracking fails so Apply never breaks.
  const handleApply = async () => {
    try {
      const { data } = await jobService.trackClick(job.id)
      window.open(data.redirect_url, '_blank', 'noopener,noreferrer')
    } catch {
      window.open(job.redirect_url, '_blank', 'noopener,noreferrer')
    }
  }

  // Formats the salary range for display: "₹X.XL – ₹Y.YL/yr", "From ₹X.XL/yr", or null when unset
  const salary =
    job.salary_min && job.salary_max
      ? `₹${(job.salary_min / 100000).toFixed(1)}L – ₹${(job.salary_max / 100000).toFixed(1)}L/yr`
      : job.salary_min
      ? `From ₹${(job.salary_min / 100000).toFixed(1)}L/yr`
      : null

  return (
    <div className="bg-white border border-border rounded-xl p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base">{job.title}</h3>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />{job.city}
            </span>
            <span className="flex items-center gap-1">
              <Briefcase className="h-3.5 w-3.5" />{JOB_TYPE_LABELS[job.job_type] || job.job_type}
            </span>
            {salary && <span className="text-green-700 font-medium">{salary}</span>}
          </div>
        </div>
        <button
          onClick={handleApply}
          className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
        >
          Apply <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

/**
 * Renders a company's branded careers page: header (logo, name,
 * description, website/contact), a list of its open job postings, and a
 * "Powered by StepsDoor" footer. Shows a 404-style message if the slug
 * doesn't resolve to a company.
 */
export default function CompanyCareers() {
  const { slug } = useParams() // company slug from the /careers/:slug route
  const [company, setCompany] = useState(null)
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false) // true when the API returns 404 for this slug

  // Fetch the company profile + its open jobs together whenever the slug
  // changes; a 404 response flips notFound instead of leaving a blank page.
  useEffect(() => {
    companyService.careers(slug)
      .then(({ data }) => {
        setCompany(data.company)
        setJobs(data.jobs)
      })
      .catch((err) => {
        if (err?.response?.status === 404) setNotFound(true)
      })
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground">
        Loading...
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Company not found</h1>
          <p className="text-muted-foreground mt-2">This career page doesn't exist.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      {/* Company header */}
      <div className="bg-white border border-border rounded-xl p-8 text-center space-y-3">
        {company.logo && (
          <img src={company.logo} alt={company.name} className="h-16 w-16 object-contain rounded-lg mx-auto" />
        )}
        <h1 className="text-2xl font-bold">{company.name}</h1>
        {company.description && (
          <p className="text-muted-foreground text-sm max-w-lg mx-auto">{company.description}</p>
        )}
        <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground flex-wrap pt-1">
          {company.website && (
            <a
              href={company.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-primary transition-colors"
            >
              <Globe className="h-3.5 w-3.5" />{company.website.replace(/^https?:\/\//, '')}
            </a>
          )}
          {company.contact_email && (
            <span>{company.contact_email}</span>
          )}
        </div>
      </div>

      {/* Jobs */}
      <div>
        <h2 className="text-lg font-semibold mb-4">
          Open Positions <span className="text-muted-foreground font-normal text-base">({jobs.length})</span>
        </h2>

        {/* Empty state vs. list of open jobs for this company */}
        {jobs.length === 0 ? (
          <div className="bg-white border border-border rounded-xl p-12 text-center text-muted-foreground">
            <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No open positions right now.</p>
            <p className="text-sm mt-1">Check back soon!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map(job => <JobCard key={job.id} job={job} />)}
          </div>
        )}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Powered by <a href="/" className="text-primary hover:underline">StepsDoor</a>
      </p>
    </div>
  )
}
