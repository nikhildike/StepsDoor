/**
 * Job Seeker Saved Jobs page.
 *
 * Route: `/seeker/saved` (nested under the seeker account layout).
 * Access: job seeker accounts only.
 *
 * Lists every job the seeker has bookmarked — StepsDoor posts, openings from
 * company careers pages and government jobs — with actions to apply or remove
 * the bookmark. Jobs that have since closed stay listed, marked "Closed".
 * Applying to a StepsDoor post goes through click tracking; other kinds open
 * the company's page / official notice directly.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bookmark, MapPin, Briefcase, ExternalLink, Trash2 } from 'lucide-react'
import { seekerService } from '@/services/seekerService'
import { jobService } from '@/services/jobService'
import { formatDate } from '@/utils/formatDate'

// Maps backend job_type enum values to human-readable labels for display (StepsDoor posts only).
const JOB_TYPE_LABELS = {
  full_time: 'Full Time', part_time: 'Part Time',
  contract: 'Contract', internship: 'Internship',
}

// Saved-job kind -> where the job came from, shown as a small label on each card.
const SOURCE_LABELS = { job: 'StepsDoor', company: 'Company careers page', govt: 'Government job' }

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

  // Handles clicking "Apply" on a saved job. For StepsDoor posts, fires a
  // click-tracking request (which records the click for the company's analytics
  // and returns the current redirect_url), then opens that URL in a new tab; if
  // tracking fails, falls back to the stored redirect_url so the user isn't
  // blocked. Company and govt jobs aren't tracked: their stored link opens directly.
  // POST /jobs/:id/track-click/ (jobs app, analytics tracking).
  const apply = async (s) => {
    if (s.kind !== 'job') {
      window.open(s.redirect_url, '_blank', 'noopener,noreferrer')
      return
    }
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
          <p className="text-sm mt-1">Tap the bookmark on any job — StepsDoor, company or government — to keep it here.</p>
          {/* Stays inside the dashboard (the public /jobs page has no sidebar). */}
          <Link to="/seeker/browse-jobs" className="text-primary text-sm hover:underline mt-3 inline-block">Browse Jobs →</Link>
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
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{SOURCE_LABELS[s.kind]}</span>
                    {!s.is_open && <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-600">Closed</span>}
                  </div>
                  <h3 className="font-semibold">{s.job_title}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{s.company_name}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                    {s.city && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{s.city}</span>}
                    {s.job_type && (
                      <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{JOB_TYPE_LABELS[s.job_type] || s.job_type}</span>
                    )}
                    {s.deadline && <span>Apply by {formatDate(s.deadline)}</span>}
                    {/* Only shown when both salary_min and salary_max are set on the job. */}
                    {salary && <span className="text-green-700 font-medium">{salary}</span>}
                    {/* Only shown when the company has published a career page slug. */}
                    {/* Links stay inside the dashboard (/seeker/...). */}
                    {s.company_slug && (
                      <Link to={`/seeker/careers/${s.company_slug}`} className="text-primary hover:underline">
                        Career page →
                      </Link>
                    )}
                    {s.kind === 'govt' && (
                      <Link to={`/seeker/govt-jobs/${s.govt_job}`} className="text-primary hover:underline">
                        Details →
                      </Link>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {/* Triggers the tracked-redirect apply() handler. */}
                  {s.is_open && (
                    <button
                      onClick={() => apply(s)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      Apply <ExternalLink className="h-3 w-3" />
                    </button>
                  )}
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
