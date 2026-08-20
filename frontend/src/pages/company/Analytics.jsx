/**
 * Company Analytics page.
 *
 * Route: `/dashboard/analytics` (nested under the company dashboard layout).
 * Access: company accounts only — mounted behind `ProtectedRoute requireCompany`.
 *
 * Renders a lightweight click-performance view for the logged-in company's own
 * job listings: total clicks, total listing count, and a per-job breakdown.
 */
import { useEffect, useState } from 'react'
import { MousePointerClick } from 'lucide-react'
import { jobService } from '@/services/jobService'

/**
 * Renders click-performance analytics for the logged-in company's job listings:
 * total clicks, total listing count, and a horizontal bar chart (built from plain
 * styled divs, not Recharts) showing clicks per job sorted highest first.
 */
export default function Analytics() {
  // Company's own job postings (each includes a `clicks` count from analytics tracking).
  const [jobs, setJobs] = useState([])
  // True while the initial fetch is in flight; gates the loading state below.
  const [loading, setLoading] = useState(true)

  // Fetch the company's job listings once on mount so click counts can be charted.
  // GET /jobs/my/ (jobs app) — returns only jobs owned by the authenticated company.
  useEffect(() => {
    jobService.myJobs()
      .then(res => setJobs(res.data))
      .finally(() => setLoading(false))
  }, [])

  // Highest click count across all jobs (min 1 to avoid divide-by-zero when scaling bar widths).
  const maxClicks = Math.max(...jobs.map(j => j.clicks || 0), 1)
  // Sum of clicks across every job listing, shown in the "Total Clicks" stat card.
  const totalClicks = jobs.reduce((sum, j) => sum + (j.clicks || 0), 0)

  // Loading state: render nothing but a placeholder until jobs have been fetched.
  if (loading) return <div className="text-muted-foreground">Loading...</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground mt-1">Click performance across your job listings.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-sm">
        <div className="bg-white rounded-xl border border-border p-5">
          <p className="text-sm text-muted-foreground">Total Clicks</p>
          <p className="text-3xl font-bold mt-1">{totalClicks}</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-5">
          <p className="text-sm text-muted-foreground">Job Listings</p>
          <p className="text-3xl font-bold mt-1">{jobs.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <MousePointerClick className="h-4 w-4" /> Clicks by Job
        </h2>
        {jobs.length === 0 ? (
          // Empty state: company has no job postings, so there's nothing to chart.
          <p className="text-muted-foreground text-sm">No job postings yet.</p>
        ) : (
          <div className="space-y-4">
            {jobs
              // Sort descending by click count so the highest performers appear first.
              .sort((a, b) => (b.clicks || 0) - (a.clicks || 0))
              // Render one row per job: a label/count line plus a proportional bar.
              .map(job => (
                <div key={job.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium truncate max-w-xs">{job.title}</span>
                    <span className="text-sm text-muted-foreground ml-4 shrink-0">{job.clicks || 0} clicks</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    {/* Bar width is this job's clicks as a percentage of the max, giving a simple relative bar chart. */}
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${((job.clicks || 0) / maxClicks) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            }
          </div>
        )}
      </div>
    </div>
  )
}
