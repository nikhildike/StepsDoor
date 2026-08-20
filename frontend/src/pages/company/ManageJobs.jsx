/**
 * Company Manage Jobs page.
 *
 * Route: `/dashboard/jobs` (nested under the company dashboard layout).
 * Access: company accounts only — mounted behind `ProtectedRoute requireCompany`.
 *
 * Lists all of the company's own job postings (active and inactive) in a table
 * with per-row actions to toggle a listing active/inactive or delete it, plus
 * a shortcut to post a new job.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PlusCircle, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import { jobService } from '@/services/jobService'
import { Button } from '@/components/ui/Button'

/**
 * Renders the full list of the company's job postings with toggle-active and
 * delete actions per row.
 */
export default function ManageJobs() {
  // Full list of the company's job postings (not paginated/limited, unlike the dashboard's "recent" view).
  const [jobs, setJobs] = useState([])
  // True while the initial fetch is in flight.
  const [loading, setLoading] = useState(true)

  // Fetch all of the company's job postings once on mount.
  // GET /jobs/my/ (jobs app) — jobs owned by the authenticated company.
  useEffect(() => {
    jobService.myJobs()
      .then(res => setJobs(res.data))
      .finally(() => setLoading(false))
  }, [])

  // Flips a job's is_active flag (active <-> inactive) and optimistically updates local state.
  // Fires when the toggle icon button in a row is clicked.
  // PATCH /jobs/:id/ (jobs app) — partial update of the job's is_active field.
  const toggleActive = async (job) => {
    await jobService.update(job.id, { is_active: !job.is_active })
    setJobs(prev => prev.map(j => j.id === job.id ? { ...j, is_active: !j.is_active } : j))
  }

  // Deletes a job posting after a native confirm() dialog, then removes it from local state.
  // Fires when the trash icon button in a row is clicked.
  // DELETE /jobs/:id/ (jobs app).
  const deleteJob = async (id) => {
    if (!confirm('Delete this job posting?')) return
    await jobService.delete(id)
    setJobs(prev => prev.filter(j => j.id !== id))
  }

  // Maps backend job_type enum values to human-readable labels for display in the table.
  const JOB_TYPE_LABELS = {
    full_time: 'Full Time', part_time: 'Part Time',
    contract: 'Contract', internship: 'Internship',
  }

  // Loading state: show a placeholder until the job list has been fetched.
  if (loading) return <div className="text-muted-foreground">Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manage Jobs</h1>
          <p className="text-muted-foreground mt-1">{jobs.length} total posting{jobs.length !== 1 ? 's' : ''}</p>
        </div>
        <Link to="/dashboard/post-job">
          <Button><PlusCircle className="h-4 w-4 mr-2" />Post a Job</Button>
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        {jobs.length === 0 ? (
          // Empty state: no jobs posted yet.
          <div className="p-12 text-center text-muted-foreground">
            <p>No jobs posted yet.</p>
            <Link to="/dashboard/post-job" className="text-primary text-sm hover:underline mt-2 inline-block">
              Post your first job →
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-muted-foreground">Title</th>
                <th className="text-left px-6 py-3 font-medium text-muted-foreground">Type</th>
                <th className="text-left px-6 py-3 font-medium text-muted-foreground">City</th>
                <th className="text-left px-6 py-3 font-medium text-muted-foreground">Clicks</th>
                <th className="text-left px-6 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-6 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* One row per job posting, with inline status badge and action buttons. */}
              {jobs.map(job => (
                <tr key={job.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-6 py-4 font-medium">{job.title}</td>
                  <td className="px-6 py-4 text-muted-foreground">{JOB_TYPE_LABELS[job.job_type] || job.job_type}</td>
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
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {/* Toggle icon swaps based on current state and calls toggleActive on click. */}
                      <button
                        onClick={() => toggleActive(job)}
                        title={job.is_active ? 'Deactivate' : 'Activate'}
                        className="p-1 rounded hover:bg-muted transition-colors"
                      >
                        {job.is_active
                          ? <ToggleRight className="h-5 w-5 text-green-600" />
                          : <ToggleLeft className="h-5 w-5 text-gray-400" />
                        }
                      </button>
                      {/* Delete button triggers the confirm-then-delete flow in deleteJob. */}
                      <button
                        onClick={() => deleteJob(job.id)}
                        title="Delete"
                        className="p-1 rounded hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </button>
                    </div>
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
