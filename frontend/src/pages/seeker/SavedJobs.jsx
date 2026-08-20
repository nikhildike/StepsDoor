/**
 * Job Seeker Saved Jobs page.
 *
 * Route: `/seeker/saved` (nested under the seeker account layout).
 * Access: job seeker accounts only.
 *
 * Lists all jobs the seeker has bookmarked, with actions to apply (redirect to
 * the company's application URL, tracked via a click event) or remove the
 * bookmark.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bookmark, MapPin, Briefcase, ExternalLink, Trash2 } from 'lucide-react'
import { seekerService } from '@/services/seekerService'
import { jobService } from '@/services/jobService'

// Maps backend job_type enum values to human-readable labels for display.
const JOB_TYPE_LABELS = {
  full_time: 'Full Time', part_time: 'Part Time',
  contract: 'Contract', internship: 'Internship',
}

/**
 * Renders the seeker's full list of saved/bookmarked job listings.
 */
export default function SavedJobs() {
  // Jobs the seeker has bookmarked, each a "saved job" record referencing the underlying job post.
  const [savedJobs, setSavedJobs] = useState([])
  // True while the initial fetch is in flight.
  const [loading, setLoading] = useState(true)

  // Fetches the seeker's saved jobs once on mount.
  // GET /jobseekers/saved-jobs/ (jobseekers app).
  useEffect(() => {
    seekerService.savedJobs()
      .then(res => setSavedJobs(res.data.results ?? res.data))
      .finally(() => setLoading(false))
  }, [])

  // Removes a bookmark and updates local state. Fires when the trash icon is clicked.
  // DELETE /jobseekers/saved-jobs/:id/ (jobseekers app).
  const unsave = async (id) => {
    await seekerService.unsaveJob(id)
    setSavedJobs(prev => prev.filter(s => s.id !== id))
  }

  // Handles clicking "Apply" on a saved job. Fires a click-tracking request to
  // the backend (which records the click and returns the current redirect_url),
  // then opens that URL in a new tab. If tracking fails, falls back to opening
  // the redirect_url already stored on the saved-job record so the user isn't blocked.
  // POST /jobs/:id/track-click/ (jobs app, analytics tracking).
  const apply = async (s) => {
    try {
      const { data } = await jobService.trackClick(s.job_post)
      window.open(data.redirect_url, '_blank', 'noopener,noreferrer')
    } catch {
      window.open(s.redirect_url, '_blank', 'noopener,noreferrer')
    }
  }

  // Loading state: show a placeholder until saved jobs have been fetched.
  if (loading) return <div className="text-muted-foreground">Loading...</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Saved Jobs</h1>
        <p className="text-muted-foreground mt-1">{savedJobs.length} saved listing{savedJobs.length !== 1 ? 's' : ''}</p>
      </div>

      {savedJobs.length === 0 ? (
        // Empty state: no bookmarks yet, prompt the seeker to browse jobs.
        <div className="bg-white rounded-xl border border-border p-12 text-center text-muted-foreground">
          <Bookmark className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No saved jobs yet</p>
          <p className="text-sm mt-1">Browse jobs and bookmark the ones you like.</p>
          <Link to="/jobs" className="text-primary text-sm hover:underline mt-3 inline-block">Browse Jobs →</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Renders one card per saved job. */}
          {savedJobs.map(s => {
            // Formats the salary range in lakhs (₹X.XL - ₹Y.YL/yr) only when both bounds are present.
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
                    {/* Only shown when both salary_min and salary_max are set on the job. */}
                    {salary && <span className="text-green-700 font-medium">{salary}</span>}
                    {/* Only shown when the company has published a career page slug. */}
                    {s.company_slug && (
                      <Link to={`/careers/${s.company_slug}`} className="text-primary hover:underline">
                        Career page →
                      </Link>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {/* Triggers the tracked-redirect apply() handler. */}
                  <button
                    onClick={() => apply(s)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Apply <ExternalLink className="h-3 w-3" />
                  </button>
                  {/* Removes this job from the saved list via unsave(). */}
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
