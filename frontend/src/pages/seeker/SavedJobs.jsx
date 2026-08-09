import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bookmark, MapPin, Briefcase, ExternalLink, Trash2 } from 'lucide-react'
import { seekerService } from '@/services/seekerService'
import { jobService } from '@/services/jobService'

const JOB_TYPE_LABELS = {
  full_time: 'Full Time', part_time: 'Part Time',
  contract: 'Contract', internship: 'Internship',
}

export default function SavedJobs() {
  const [savedJobs, setSavedJobs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    seekerService.savedJobs()
      .then(res => setSavedJobs(res.data.results ?? res.data))
      .finally(() => setLoading(false))
  }, [])

  const unsave = async (id) => {
    await seekerService.unsaveJob(id)
    setSavedJobs(prev => prev.filter(s => s.id !== id))
  }

  const apply = async (s) => {
    try {
      const { data } = await jobService.trackClick(s.job_post)
      window.open(data.redirect_url, '_blank', 'noopener,noreferrer')
    } catch {
      window.open(s.redirect_url, '_blank', 'noopener,noreferrer')
    }
  }

  if (loading) return <div className="text-muted-foreground">Loading...</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Saved Jobs</h1>
        <p className="text-muted-foreground mt-1">{savedJobs.length} saved listing{savedJobs.length !== 1 ? 's' : ''}</p>
      </div>

      {savedJobs.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-12 text-center text-muted-foreground">
          <Bookmark className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No saved jobs yet</p>
          <p className="text-sm mt-1">Browse jobs and bookmark the ones you like.</p>
          <Link to="/jobs" className="text-primary text-sm hover:underline mt-3 inline-block">Browse Jobs →</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {savedJobs.map(s => {
            const salary = s.salary_min && s.salary_max
              ? `₹${(s.salary_min / 100000).toFixed(1)}L – ₹${(s.salary_max / 100000).toFixed(1)}L/yr`
              : null

            return (
              <div key={s.id} className="bg-white rounded-xl border border-border p-5 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold">{s.job_title}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{s.company_name}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{s.city}</span>
                    <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{JOB_TYPE_LABELS[s.job_type] || s.job_type}</span>
                    {salary && <span className="text-green-700 font-medium">{salary}</span>}
                    {s.company_slug && (
                      <Link to={`/careers/${s.company_slug}`} className="text-primary hover:underline">
                        Career page →
                      </Link>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => apply(s)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Apply <ExternalLink className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => unsave(s.id)}
                    title="Remove"
                    className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
