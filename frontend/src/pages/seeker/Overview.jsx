/**
 * Account dashboard home, shared by job seekers and contractors.
 *
 * Route: `/seeker` or `/seeker/overview` (index route under the seeker account layout).
 * Access: any authenticated user (ProtectedRoute checks token only, not role).
 *
 * Job seekers see: stat cards from GET /api/jobseekers/stats/ — Saved Jobs (all
 * kinds), Active Alerts (with how many open jobs they match) and New Jobs Today
 * (open jobs added since midnight IST across StepsDoor, company careers pages
 * and govt jobs) — each linking to its page; "Jobs matching your alerts"
 * (`AlertMatches`); a saved-jobs preview; govt jobs closing soon; and the latest
 * StepsDoor job openings.
 *
 * Contractors see: stat cards from GET /api/tenders/stats/ — New Today, Saved
 * Tenders, Tender Alerts (with how many open tenders they match) and Open
 * Tenders — each linking to its page; "Tenders matching your alerts"
 * (`TenderAlertMatches`); and a recent-tenders preview. Job-seeker widgets are
 * hidden for them.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bookmark, Bell, Briefcase, ExternalLink, FileText, MapPin, Clock, Landmark } from 'lucide-react'
import { seekerService } from '@/services/seekerService'
import { jobService } from '@/services/jobService'
import { tenderService } from '@/services/tenderService'
import { govtJobService } from '@/services/govtJobService'
import { deadlineInfo, DEADLINE_BADGE } from '@/utils/deadline'
import { useAuthStore } from '@/store/authStore'
import { formatDate } from '@/utils/formatDate'
import { AlertMatches } from '@/components/alerts/AlertMatches'
import { useSavedJobs } from '@/hooks/useSavedJobs'
import { useSavedTenders } from '@/hooks/useSavedTenders'
import { TenderAlertMatches } from '@/components/tenders/TenderAlertMatches'

// Maps backend job_type enum values to human-readable labels for display.
const JOB_TYPE_LABELS = {
  full_time: 'Full Time', part_time: 'Part Time',
  contract: 'Contract', internship: 'Internship',
}

/**
 * Renders the contractor's dashboard: stat cards from GET /api/tenders/stats/
 * (each linking to its page), "Tenders matching your alerts", and the most
 * recent tenders.
 *
 * @param {{ name: string, stats: object|null, tenders: Array }} props
 *   `stats` is the /tenders/stats/ response (null while loading or if it failed).
 */
function ContractorDashboard({ name, stats, tenders }) {
  const tenderSaves = useSavedTenders() // save toggles on the alert matches
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {name}!</h1>
        <p className="text-muted-foreground mt-1">Here's the latest tender activity.</p>
      </div>

      {/* Stat cards — each links to the page with the details. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard to="/seeker/tenders" icon={FileText} color="bg-blue-500" label="New Today"
          value={stats?.new_today} note="Tenders added since midnight" />
        <StatCard to="/seeker/saved-tenders" icon={Bookmark} color="bg-amber-500" label="Saved Tenders"
          value={stats?.saved_tenders} note="Tap the bookmark on any tender" />
        <StatCard to="/seeker/alerts" icon={Bell} color="bg-purple-500" label="Tender Alerts"
          value={stats?.active_alerts}
          note={stats?.active_alerts ? `${stats.alert_matches.toLocaleString('en-IN')} matching open tenders` : 'Save a keyword to track tenders'} />
        <StatCard to="/seeker/tenders" icon={Briefcase} color="bg-green-500" label="Open Tenders"
          value={stats?.open_tenders} note="Still accepting bids" />
      </div>

      {/* Tenders matching the contractor's active alerts (or a prompt to create one). */}
      <div className="bg-white rounded-xl border border-border">
        <div className="p-5 border-b flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2"><Bell className="h-4 w-4 text-primary" /> Tenders matching your alerts</h2>
          <Link to="/seeker/alerts" className="text-sm text-primary hover:underline">Manage alerts</Link>
        </div>
        {stats && stats.active_alerts === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Save a keyword like &quot;road construction&quot; and every matching open tender shows up here.
            <div className="mt-3"><Link to="/seeker/alerts" className="text-primary hover:underline">Create a tender alert →</Link></div>
          </div>
        ) : (
          <TenderAlertMatches limit={5} saves={tenderSaves} emptyText="No open tenders match your alerts yet." />
        )}
      </div>

      {/* Recent tenders preview */}
      <div className="bg-white rounded-xl border border-border">
        <div className="p-5 border-b flex items-center justify-between">
          <h2 className="font-semibold">Recent Tenders</h2>
          {/* /seeker/tenders keeps the sidebar visible (tenders rendered inside the seeker layout) */}
          <Link to="/seeker/tenders" className="text-sm text-primary hover:underline">Browse all</Link>
        </div>
        {tenders.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">No tenders available right now.</div>
        ) : (
          <div className="divide-y">
            {tenders.map(tender => (
              <div key={tender.id} className="px-5 py-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-sm line-clamp-1">{tender.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-3">
                    <span>{tender.organisation}</span>
                    {tender.state && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />{tender.state}
                      </span>
                    )}
                    {tender.submission_deadline && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />Due {formatDate(tender.submission_deadline)}
                      </span>
                    )}
                  </p>
                </div>
                <Link to={`/seeker/tenders/${tender.id}`} className="text-xs text-primary hover:underline shrink-0">
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

/**
 * One stat card: icon, label, the number and a short note, linking to the page
 * that shows the details. `value` is null while the stats are loading.
 */
function StatCard({ to, icon: Icon, color, label, value, note }) {
  return (
    <Link to={to} className="bg-white rounded-xl border border-border p-6 flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className={`p-3 rounded-lg ${color}`}><Icon className="h-6 w-6 text-white" /></div>
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold">{value == null ? '–' : value.toLocaleString('en-IN')}</p>
        {note && <p className="text-xs text-muted-foreground truncate">{note}</p>}
      </div>
    </Link>
  )
}

/**
 * Renders the seeker's personalized dashboard: stat cards, the jobs matching
 * their alerts, a saved-jobs preview, govt jobs closing soon and the latest
 * StepsDoor job openings.
 *
 * @param {{ name: string, stats: object|null, savedJobs: Array, recentJobs: Array, govtJobs: Array }} props
 *   `stats` is the /jobseekers/stats/ response (null while loading or if it failed).
 */
function SeekerDashboard({ name, stats, savedJobs, recentJobs, govtJobs }) {
  const saves = useSavedJobs() // save toggles on the alert matches
  const today = stats?.new_jobs_today
  const todayNote = today && today.total > 0
    ? [today.company && `${today.company} company`, today.govt && `${today.govt} govt`, today.job && `${today.job} StepsDoor`].filter(Boolean).join(' · ')
    : 'Since midnight'
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {name}!</h1>
        <p className="text-muted-foreground mt-1">Here's what's happening with your job search.</p>
      </div>

      {/* Stat cards — each links to the page with the details. */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard to="/seeker/saved" icon={Bookmark} color="bg-blue-500" label="Saved Jobs"
          value={stats?.saved_jobs} note="Tap the bookmark on any job" />
        <StatCard to="/seeker/alerts" icon={Bell} color="bg-purple-500" label="Active Alerts"
          value={stats?.active_alerts}
          note={stats?.active_alerts ? `${stats.alert_matches.toLocaleString('en-IN')} matching open jobs` : 'Save a keyword to track jobs'} />
        <StatCard to="/seeker/browse-jobs" icon={Briefcase} color="bg-green-500" label="New Jobs Today"
          value={today?.total} note={todayNote} />
      </div>

      {/* Jobs matching the seeker's active alerts (or a prompt to create one). */}
      <div className="bg-white rounded-xl border border-border">
        <div className="p-5 border-b flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2"><Bell className="h-4 w-4 text-primary" /> Jobs matching your alerts</h2>
          <Link to="/seeker/alerts" className="text-sm text-primary hover:underline">Manage alerts</Link>
        </div>
        {stats && stats.active_alerts === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Save a keyword like &quot;data analyst&quot; and every matching job — StepsDoor, company and government — shows up here.
            <div className="mt-3"><Link to="/seeker/alerts" className="text-primary hover:underline">Create an alert →</Link></div>
          </div>
        ) : (
          <AlertMatches limit={5} saves={saves} emptyText="No open jobs match your alerts yet." />
        )}
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

      {/* Govt jobs closing soon — the dates students most need to act on */}
      <div className="bg-white rounded-xl border border-border">
        <div className="p-5 border-b flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2"><Landmark className="h-4 w-4 text-primary" /> Govt jobs closing soon</h2>
          <Link to="/seeker/govt-jobs" className="text-sm text-primary hover:underline">Browse all</Link>
        </div>
        {govtJobs.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">No government openings with an upcoming deadline right now.</div>
        ) : (
          <div className="divide-y">
            {govtJobs.map(job => {
              const deadline = deadlineInfo(job.application_deadline)
              return (
                <Link key={job.id} to={`/seeker/govt-jobs/${job.id}`} className="px-5 py-4 flex items-center justify-between gap-4 hover:bg-gray-50">
                  <div className="min-w-0">
                    <p className="font-medium text-sm line-clamp-1">{job.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {job.organisation}{job.vacancy_count ? ` · ${job.vacancy_count.toLocaleString('en-IN')} vacancies` : ''}
                    </p>
                  </div>
                  {deadline && (
                    <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${DEADLINE_BADGE[deadline.urgency]}`}>{deadline.label}</span>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Latest jobs */}
      <div className="bg-white rounded-xl border border-border">
        <div className="p-5 border-b flex items-center justify-between">
          <h2 className="font-semibold">Latest Job Openings</h2>
          <Link to="/seeker/browse-jobs" className="text-sm text-primary hover:underline">Browse all</Link>
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
                <Link to={`/seeker/browse-jobs/${job.id}`} className="text-xs text-primary hover:underline shrink-0 ml-4">
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

/**
 * Dashboard entry point: reads the current user's role from the auth store
 * and delegates to either `ContractorDashboard` or `SeekerDashboard`. Fetches
 * only the data relevant to the role so contractors never trigger job-seeker
 * API calls and vice versa.
 */
export default function SeekerOverview() {
  const { user } = useAuthStore()
  // True for contractor accounts; determines which data to fetch and which
  // dashboard component to render.
  const isContractor = !!user?.is_contractor

  // Shared: profile name for the greeting header.
  const [profile, setProfile] = useState(null)
  // Seeker-only state.
  const [savedJobs, setSavedJobs] = useState([])
  const [stats, setStats] = useState(null) // /jobseekers/stats/ counts for the stat cards
  const [recentJobs, setRecentJobs] = useState([])
  const [govtJobs, setGovtJobs] = useState([]) // open govt jobs with the nearest deadlines (seekers)
  // Contractor-only state.
  const [tenders, setTenders] = useState([])
  const [tenderStats, setTenderStats] = useState(null) // /tenders/stats/ counts for the contractor stat cards
  // True while the initial combined fetch is in flight.
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isContractor) {
      // Contractors need tender counts and recent tenders, not saved jobs or job
      // listings. Profile is still fetched for the greeting name. Each request fails
      // on its own (empty section) — one failing call must not blank the dashboard.
      Promise.all([
        seekerService.profile().catch(() => ({ data: null })),
        tenderService.list({ page_size: 5 }).catch(() => ({ data: [] })),
        tenderService.stats().catch(() => ({ data: null })),
      ]).then(([p, t, st]) => {
        setProfile(p.data)
        setTenders(t.data.results ?? t.data)
        setTenderStats(st.data)
      }).finally(() => setLoading(false))
    } else {
      // Job seekers: profile, stat-card counts, saved jobs, and recent job listings.
      // GET /jobseekers/profiles/me/, /jobseekers/stats/, /jobseekers/saved-jobs/, /jobs/?page_size=5
      // Each request fails on its own (empty section) rather than blanking the dashboard.
      Promise.all([
        seekerService.profile().catch(() => ({ data: null })),
        seekerService.stats().catch(() => ({ data: null })),
        seekerService.savedJobs().catch(() => ({ data: [] })),
        jobService.list({ page_size: 5 }).catch(() => ({ data: [] })),
      ]).then(([p, st, s, j]) => {
        setProfile(p.data)
        setStats(st.data)
        setSavedJobs(s.data.results ?? s.data)
        setRecentJobs(j.data.results ?? j.data)
      }).finally(() => setLoading(false))
    }
  }, [isContractor])

  // Job seekers: govt openings closing soonest. Fetched on its own (and allowed to fail)
  // so it can never blank the rest of the dashboard. Jobs without a stated deadline are
  // skipped (SQLite sorts null deadlines first).
  useEffect(() => {
    if (isContractor) return
    govtJobService.list({ ordering: 'application_deadline', page_size: 20 })
      .then(({ data }) => setGovtJobs((data.results ?? data).filter(j => j.application_deadline).slice(0, 5)))
      .catch(() => setGovtJobs([]))
  }, [isContractor])

  // Builds the display name for the welcome header.
  // Priority: profile first/last name → user first/last name (from auth store)
  // → username → 'there' as final fallback.
  const profileName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : ''
  const authName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : ''
  const name = profileName || authName || user?.username || 'there'

  if (loading) return <div className="text-muted-foreground">Loading...</div>

  return isContractor ? (
    <ContractorDashboard name={name} stats={tenderStats} tenders={tenders} />
  ) : (
    <SeekerDashboard name={name} stats={stats} savedJobs={savedJobs} recentJobs={recentJobs} govtJobs={govtJobs} />
  )
}
