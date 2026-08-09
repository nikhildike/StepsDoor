import { useNavigate } from 'react-router-dom'
import { useJobs } from '@/hooks/useJobs'
import { useSavedJobs } from '@/hooks/useSavedJobs'
import { useAuthStore } from '@/store/authStore'
import { JobCard } from '@/components/jobs/JobCard'
import { JobFilter } from '@/components/jobs/JobFilter'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const PAGE_SIZE = 20

export default function Jobs() {
  const { jobs, total, loading, filters, setFilters, setPage } = useJobs()
  const { isSaved, toggleSave, isSeeker, pending } = useSavedJobs()
  const { token } = useAuthStore()
  const navigate = useNavigate()

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const currentPage = filters.page ?? 1

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
        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : jobs.length === 0 ? (
          <EmptyState title="No jobs found" description="Try adjusting your filters." />
        ) : (
          <>
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
