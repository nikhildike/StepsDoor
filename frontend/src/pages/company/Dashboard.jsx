/**
 * Company Dashboard — the landing page for logged-in company accounts.
 *
 * Route: `/dashboard` (index route under the company dashboard layout, see AppNavigator/routes config).
 * Access: company accounts only — mounted behind `ProtectedRoute requireCompany`.
 *
 * Summarizes the company's job-posting activity (active job count, total clicks,
 * total postings), surfaces the public career page link, and lists the most
 * recent job postings in a table.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Briefcase, MousePointerClick, PlusCircle, TrendingUp, Link2, Copy, Check } from 'lucide-react'
import { jobService } from '@/services/jobService'
import { companyService } from '@/services/companyService'

/**
 * Banner shown on the company dashboard advertising the company's public
 * career page (`/careers/:slug`) and offering a one-click copy of its URL.
 * @param {{ slug: string }} props - The company's unique slug used to build the public career page URL.
 */
function CareerPageBanner({ slug }) {
  // Tracks whether the "Copied!" confirmation state should currently be shown.
  const [copied, setCopied] = useState(false)
  const url = `${window.location.origin}/careers/${slug}`

  // Copies the public career page URL to the clipboard and briefly shows a "Copied!" confirmation.
  // Fires when the user clicks the "Copy link" button.
  const copy = () => {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center gap-4">
      <div className="p-2 rounded-lg bg-primary/10">
        <Link2 className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">Your Career Page</p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary hover:underline truncate block"
        >
          {url}
        </a>
      </div>
      <button
        onClick={copy}
        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-md hover:bg-white transition-colors"
      >
        {copied ? <><Check className="h-3.5 w-3.5 text-green-600" />Copied!</> : <><Copy className="h-3.5 w-3.5" />Copy link</>}
      </button>
    </div>
  )
}

/**
 * Small reusable stat tile used on the dashboard summary row (icon + label + value).
 * @param {{ icon: React.ComponentType, label: string, value: string|number, color: string }} props
 */
function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-xl border border-border p-6 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  )
}

/**
 * Company Dashboard page — the landing screen after a company logs in.
 *
 * Route: `/dashboard` (index route of the company dashboard layout).
 * Access: company accounts only — mounted behind `ProtectedRoute requireCompany`.
 *
 * Renders a welcome header, the public career page banner (once the company
 * has a slug), summary stat cards (active jobs, total clicks, total postings,
 * a quick "post a job" shortcut), and a table of the 5 most recent job postings.
 */
export default function Dashboard() {
  // Company's own job postings, used to compute stats and populate the recent postings table.
  const [jobs, setJobs] = useState([])
  // The logged-in company's profile (name, slug, etc.).
  const [company, setCompany] = useState(null)
  // True while the initial combined fetch is in flight.
  const [loading, setLoading] = useState(true)

  // Fetch the company's jobs and profile in parallel on mount.
  // GET /jobs/my/ (jobs app) — jobs owned by this company.
  // GET /companies/me/ (companies app) — the authenticated company's profile.
  useEffect(() => {
    Promise.all([jobService.myJobs(), companyService.get()])
      .then(([jobsRes, companyRes]) => {
        setJobs(jobsRes.data)
        setCompany(companyRes.data)
      })
      .finally(() => setLoading(false))
  }, [])

  // Count of currently active (published/visible) job listings.
  const activeJobs = jobs.filter(j => j.is_active).length
  // Sum of clicks across all of the company's job listings.
  const totalClicks = jobs.reduce((sum, j) => sum + (j.clicks || 0), 0)

  // Loading state: show a placeholder until both jobs and company data have arrived.
  if (loading) return <div className="text-muted-foreground">Loading...</div>

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {company?.name || 'Company'}</h1>
        <p className="text-muted-foreground mt-1">Here's an overview of your job listings.</p>
      </div>

      {/* Only show the career page banner once the company profile has a slug to build the URL from. */}
      {company?.slug && <CareerPageBanner slug={company.slug} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Briefcase} label="Active Jobs" value={activeJobs} color="bg-blue-500" />
        <StatCard icon={MousePointerClick} label="Total Clicks" value={totalClicks} color="bg-green-500" />
        <StatCard icon={TrendingUp} label="Total Postings" value={jobs.length} color="bg-purple-500" />
        <div className="bg-white rounded-xl border border-border p-6 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-orange-500">
            <PlusCircle className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Quick Action</p>
            <Link to="/dashboard/post-job" className="text-sm font-semibold text-primary hover:underline">
              Post a new job →
            </Link>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="font-semibold">Recent Job Postings</h2>
          <Link to="/dashboard/jobs" className="text-sm text-primary hover:underline">View all</Link>
        </div>
        {jobs.length === 0 ? (
          // Empty state: no jobs posted yet, prompt the company to create their first listing.
          <div className="p-12 text-center text-muted-foreground">
            <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No jobs posted yet.</p>
            <Link to="/dashboard/post-job" className="text-primary text-sm hover:underline mt-2 inline-block">
              Post your first job →
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-muted-foreground">Job Title</th>
                <th className="text-left px-6 py-3 font-medium text-muted-foreground">Location</th>
                <th className="text-left px-6 py-3 font-medium text-muted-foreground">Clicks</th>
                <th className="text-left px-6 py-3 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {/* Only the 5 most recent postings are shown here; full list lives on the Manage Jobs page. */}
              {jobs.slice(0, 5).map(job => (
                <tr key={job.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-6 py-4 font-medium">{job.title}</td>
                  <td className="px-6 py-4 text-muted-foreground">{job.city}</td>
                  <td className="px-6 py-4">{job.clicks}</td>
                  <td className="px-6 py-4">
                    {/* Conditional badge styling: green for active listings, grey for inactive ones. */}
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      job.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {job.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
