import { useEffect, useState } from 'react'
import { MousePointerClick } from 'lucide-react'
import { jobService } from '@/services/jobService'

export default function Analytics() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    jobService.myJobs()
      .then(res => setJobs(res.data))
      .finally(() => setLoading(false))
  }, [])

  const maxClicks = Math.max(...jobs.map(j => j.clicks || 0), 1)
  const totalClicks = jobs.reduce((sum, j) => sum + (j.clicks || 0), 0)

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
          <p className="text-muted-foreground text-sm">No job postings yet.</p>
        ) : (
          <div className="space-y-4">
            {jobs
              .sort((a, b) => (b.clicks || 0) - (a.clicks || 0))
              .map(job => (
                <div key={job.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium truncate max-w-xs">{job.title}</span>
                    <span className="text-sm text-muted-foreground ml-4 shrink-0">{job.clicks || 0} clicks</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
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
