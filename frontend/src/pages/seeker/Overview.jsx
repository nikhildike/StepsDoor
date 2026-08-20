/**
 * Job Seeker Overview page (seeker dashboard home).
 *
 * Route: `/seeker` or `/seeker/overview` (index route under the seeker account layout).
 * Access: job seeker accounts only.
 *
 * Summarizes the seeker's account activity: saved jobs count, active alert
 * count, "new jobs today" count, a preview of saved jobs, and a preview of
 * the latest job openings across the platform.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bookmark, Bell, Briefcase, ExternalLink } from 'lucide-react'
import { seekerService } from '@/services/seekerService'
import { jobService } from '@/services/jobService'

// Maps backend job_type enum values to human-readable labels for display.
const JOB_TYPE_LABELS = {
  full_time: 'Full Time', part_time: 'Part Time',
  contract: 'Contract', internship: 'Internship',
}

/**
 * Renders the seeker's personalized dashboard: stat cards, a saved-jobs
 * preview, and a preview of the most recent job listings.
 */
export default function SeekerOverview() {
  // Job seeker's profile (first/last name used for the welcome greeting).
  const [profile, setProfile] = useState(null)
  // Jobs the seeker has bookmarked.
  const [savedJobs, setSavedJobs] = useState([])
  // Job alerts the seeker has configured.
  const [alerts, setAlerts] = useState([])
  // Most recent job listings platform-wide (used for the "Latest Job Openings" preview and the "New Jobs Today" stat).
  const [recentJobs, setRecentJobs] = useState([])
  // True while the initial combined fetch is in flight.
  const [loading, setLoading] = useState(true)

  // Fetches profile, saved jobs, alerts, and the 5 most recent job listings in parallel on mount.
  // GET /jobseekers/profiles/me/ (jobseekers app)
  // GET /jobseekers/saved-jobs/ (jobseekers app)
  // GET /alerts/ (alerts app)
  // GET /jobs/?page_size=5 (jobs app) — latest public job listings.
  useEffect(() => {
    Promise.all([
      seekerService.profile(),
      seekerService.savedJobs(),
      seekerService.alerts(),
      jobService.list({ page_size: 5 }),
    ]).then(([p, s, a, j]) => {
      setProfile(p.data)
      setSavedJobs(s.data.results ?? s.data)
      setAlerts(a.data.results ?? a.data)
      setRecentJobs(j.data.results ?? j.data)
    }).finally(() => setLoading(false))
  }, [])

  // Builds the display name for the welcome header, falling back to "there" if no name is set.
  const name = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'there' : 'there'

  // Loading state: show a placeholder until all four data sources have loaded.
  if (loading) return <div className="text-muted-foreground">Loading...</div>

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {name}!</h1>
        <p className="text-muted-foreground mt-1">Here's what's happening with your job search.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-border p-6 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-blue-500"><Bookmark className="h-6 w-6 text-white" /></div>
          <div>
            <p className="text-sm text-muted-foreground">Saved Jobs</p>
            <p className="text-2xl font-bold">{savedJobs.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-border p-6 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-purple-500"><Bell className="h-6 w-6 text-white" /></div>
          <div>
            <p className="text-sm text-muted-foreground">Active Alerts</p>
            <p className="text-2xl font-bold">{alerts.filter(a => a.is_active).length}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-border p-6 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-green-500"><Briefcase className="h-6 w-6 text-white" /></div>
          <div>
            <p className="text-sm text-muted-foreground">New Jobs Today</p>
            <p className="text-2xl font-bold">{recentJobs.length}+</p>
          </div>
        </div>
      </div>

      {/* Saved jobs preview: only rendered when the seeker has at least one saved job. */}
      {savedJobs.length > 0 && (
        <div className="bg-white rounded-xl border border-border">
          <div className="p-5 border-b flex items-center justify-between">
            <h2 className="font-semibold">Saved Jobs</h2>
            <Link to="/seeker/saved" className="text-sm text-primary hover:underline">View all</Link>
          </div>
          <div className="divide-y">
            {/* Shows only the first 3 saved jobs; full list lives on the Saved Jobs page. */}
            {savedJobs.slice(0, 3).map(s => (
              <div key={s.id} className="px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{s.job_title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.company_name} · {s.city}</p>
                </div>
                <a
                  href={s.redirect_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  Apply <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Latest jobs */}
      <div className="bg-white rounded-xl border border-border">
        <div className="p-5 border-b flex items-center justify-between">
          <h2 className="font-semibold">Latest Job Openings</h2>
          <Link to="/jobs" className="text-sm text-primary hover:underline">Browse all</Link>
        </div>
        {recentJobs.length === 0 ? (
          // Empty state: no job listings returned by the API.
          <div className="p-8 text-center text-muted-foreground text-sm">No jobs available right now.</div>
        ) : (
          <div className="divide-y">
            {/* recentJobs is already limited to 5 by the page_size param, but sliced again defensively. */}
            {recentJobs.slice(0, 5).map(job => (
              <div key={job.id} className="px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{job.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {job.company_name} · {job.city} · {JOB_TYPE_LABELS[job.job_type] || job.job_type}
                  </p>
                </div>
                <Link to={`/jobs/${job.id}`} className="text-xs text-primary hover:underline shrink-0 ml-4">
                  View →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
