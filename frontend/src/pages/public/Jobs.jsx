/**
 * Jobs.jsx
 *
 * Public job listing/browse page mounted at `/jobs` (see App.jsx). Displays
 * a paginated, filterable grid of private (company-posted) job listings.
 * All data fetching, filter state, and pagination live in the `useJobs`
 * hook; this component is mostly presentational plumbing between that hook
 * and the `JobFilter`/`JobCard` components.
 */
import { useNavigate } from 'react-router-dom'
import { useJobs } from '@/hooks/useJobs'
import { useSavedJobs } from '@/hooks/useSavedJobs'
import { useAuthStore } from '@/store/authStore'
import { JobCard } from '@/components/jobs/JobCard'
import { JobFilter } from '@/components/jobs/JobFilter'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const PAGE_SIZE = 20 // must match the backend's page size for the Jobs list endpoint, used only to compute totalPages

/**
 * Renders the job search/browse experience: filter bar, results grid (with
 * loading/empty states), pagination controls, and a save/sign-in prompt.
 * Used by anonymous and signed-in visitors alike; save-job actions are
 * gated to signed-in job seekers.
 */
export default function Jobs() {
  // useJobs owns query-param-driven filter state, fetches the matching page
  // of jobs from the API, and exposes setters to change filters/page.
  const { jobs, total, loading, filters, setFilters, setPage } = useJobs()
  // Shared saved-jobs hook: tracks which jobs are saved, exposes a toggle,
  // whether the current user is a job seeker, and per-job pending state.
  const { isSaved, toggleSave, isSeeker, pending } = useSavedJobs()
  const { token } = useAuthStore()
  const navigate = useNavigate()

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const currentPage = filters.page ?? 1

  // Save/unsave handler passed down to each JobCard. Anonymous visitors are
  // redirected to sign in; non-seeker accounts (e.g. companies) are no-ops.
  const handleToggleSave = (jobId) => {
    if (!token) {
      navigate('/login')
      return
    }
    if (!isSeeker) return
    toggleSave(jobId)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Browse Jobs</h1>
        {total > 0 && (
          <p className="text-muted-foreground mt-1">{total} job{total !== 1 ? 's' : ''} found</p>
        )}
      </div>

      <JobFilter filters={filters} onChange={setFilters} />

      <div className="mt-6">
        {/* Loading / empty / results states, in that priority order */}
        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : jobs.length === 0 ? (
          <EmptyState title="No jobs found" description="Try adjusting your filters." />
        ) : (
          <>
            {/* Job results grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {jobs.map(job => (
                <JobCard
                  key={job.id}
                  job={job}
                  isSaved={isSeeker && isSaved(job.id)}
                  onToggleSave={handleToggleSave}
                  isPending={pending.has(job.id)}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-3">
                <button
                  onClick={() => setPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="flex items-center gap-1 px-3 py-2 text-sm rounded-md border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="flex items-center gap-1 px-3 py-2 text-sm rounded-md border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}

            {!token && (
              <p className="text-center text-sm text-muted-foreground mt-6">
                <button onClick={() => navigate('/login')} className="text-primary hover:underline">Sign in</button>
                {' '}to save jobs and get alerts
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
