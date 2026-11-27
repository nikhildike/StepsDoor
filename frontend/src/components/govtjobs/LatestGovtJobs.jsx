/**
 * LatestGovtJobs.jsx
 *
 * Members-only browse list of scraped government job openings (GET /api/govtjobs/)
 * from the recruiter spiders (UPSC, SSC, IBPS, RRB, ...). Keyword search, state and
 * category filters, newest / closing soon / most vacancies sort, and paging. Each card
 * shows a deadline badge ("Closes in 3 days"), vacancies and qualification, plus
 * one-click "Notification PDF" and "Official site" buttons — what an applicant needs.
 *
 * Rendered as the "Latest openings" view of pages/public/GovtJobs.jsx (mounted at
 * /govt-jobs and, in the job seeker dashboard, /seeker/govt-jobs). Guests get the
 * MembersOnly prompt and no request is made (the API 401s anonymous calls). The
 * keyword lives in the URL (?search=...), so the navbar search can link here filtered.
 */
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Users, GraduationCap, FileDown, ExternalLink, ChevronLeft, ChevronRight, Search, MapPin } from 'lucide-react'
import { govtJobService } from '@/services/govtJobService'
import { useAuthStore } from '@/store/authStore'
import { MembersOnly } from '@/components/ui/MembersOnly'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { deadlineInfo, DEADLINE_BADGE } from '@/utils/deadline'
import { formatDate } from '@/utils/formatDate'
import { useListingPrefix } from '@/hooks/useDashboardBase'
import { useSavedJobs } from '@/hooks/useSavedJobs'
import { SaveJobButton } from '@/components/jobs/SaveJobButton'

// Mirrors backend apps.govtjobs.models.GovtJobCategory.
export const GOVT_JOB_CATEGORIES = [
  { value: 'civil_services', label: 'Civil Services' },
  { value: 'banking', label: 'Banking' },
  { value: 'railway', label: 'Railway' },
  { value: 'police', label: 'Police & Defence' },
  { value: 'teaching', label: 'Teaching' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'psu', label: 'PSU' },
  { value: 'state_govt', label: 'State Government' },
  { value: 'other', label: 'Other' },
]
const CATEGORY_LABEL = Object.fromEntries(GOVT_JOB_CATEGORIES.map(c => [c.value, c.label]))

// Sort options → the API's ?ordering= values (GovtJobViewSet.ordering_fields).
const SORTS = [
  { value: '-published_at', label: 'Newest first' },
  { value: 'application_deadline', label: 'Closing soon' },
  { value: '-vacancy_count', label: 'Most vacancies' },
]

const PAGE_SIZE = 20 // the backend's default page size (core/pagination.py)

/**
 * One opening: title → /govt-jobs/:id (/seeker/govt-jobs/:id in the dashboard, via `prefix`), organisation, a row of facts (deadline badge,
 * vacancies, qualification, state, category), the two apply-side actions, and a save toggle
 * (`save` = {saved, pending, onToggle}; omitted for company accounts).
 */
function GovtJobCard({ job, prefix, save }) {
  const deadline = deadlineInfo(job.application_deadline)
  return (
    <div className="rounded-lg border border-border bg-white p-4 transition-shadow hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <Link to={`${prefix}/govt-jobs/${job.id}`} className="text-sm font-medium text-foreground hover:text-primary line-clamp-2">
          {job.title}
        </Link>
        <div className="flex shrink-0 items-center gap-1">
          {deadline && (
            <span className={`rounded px-2 py-0.5 text-xs font-medium ${DEADLINE_BADGE[deadline.urgency]}`}>
              {deadline.label}
            </span>
          )}
          {save && <SaveJobButton {...save} />}
        </div>
      </div>
      <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{job.organisation}</p>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {job.vacancy_count ? (
          <span className="flex items-center gap-1"><Users className="h-3 w-3" />{job.vacancy_count.toLocaleString('en-IN')} vacancies</span>
        ) : null}
        {job.qualification && (
          <span className="flex items-center gap-1"><GraduationCap className="h-3 w-3" /><span className="line-clamp-1">{job.qualification}</span></span>
        )}
        {job.state && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.state}</span>}
        {!deadline && job.published_at && <span>Posted {formatDate(job.published_at)} · closing date in notification</span>}
        {CATEGORY_LABEL[job.category] && <span className="rounded bg-muted px-1.5 py-0.5">{CATEGORY_LABEL[job.category]}</span>}
      </div>

      {(job.notification_pdf_url || job.source_url) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {job.notification_pdf_url && (
            <a href={job.notification_pdf_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-muted">
              <FileDown className="h-3.5 w-3.5" /> Notification PDF
            </a>
          )}
          {job.source_url && (
            <a href={job.source_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90">
              Official site <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * LatestGovtJobs
 *
 * Filter bar + paged list of open govt jobs. No props; reads the auth token to
 * choose between the list and the sign-in prompt.
 */
export function LatestGovtJobs() {
  const { token } = useAuthStore()
  const { isSaved, toggleSave, isPending, isSeeker } = useSavedJobs() // save toggles on the cards
  const prefix = useListingPrefix() // '/seeker' inside the dashboard, so detail links stay in it
  const [searchParams, setSearchParams] = useSearchParams()
  const urlSearch = searchParams.get('search') || ''        // keyword from the URL (?search=...)
  const [searchInput, setSearchInput] = useState(urlSearch) // what's typed; applied after a pause
  const [search, setSearch] = useState(urlSearch)           // applied keyword sent to the API
  const [state, setState] = useState('')
  const [category, setCategory] = useState('')
  const [ordering, setOrdering] = useState(SORTS[0].value)
  const [page, setPage] = useState(1)
  const [states, setStates] = useState([])   // [{state, count}] for the state picker
  const [result, setResult] = useState(null) // last API page: {count, results}
  const [loading, setLoading] = useState(false)

  // A new ?search= from outside (e.g. the navbar while already on this page) replaces the box.
  useEffect(() => { setSearchInput(urlSearch) }, [urlSearch])

  // Apply the search box 400 ms after typing stops: back to page 1, mirrored in the URL.
  useEffect(() => {
    const timer = setTimeout(() => {
      const value = searchInput.trim()
      setSearch(value)
      setPage(1)
      if (value !== urlSearch) setSearchParams(value ? { search: value } : {}, { replace: true })
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput, urlSearch, setSearchParams])

  // State picker options (only states that currently have openings).
  useEffect(() => {
    if (!token) return
    govtJobService.states().then(({ data }) => setStates(data)).catch(() => setStates([]))
  }, [token])

  // The list — refetched whenever a filter, the sort or the page changes.
  useEffect(() => {
    if (!token) return
    let cancelled = false
    setLoading(true)
    govtJobService
      .list({ search: search || undefined, state: state || undefined, category: category || undefined, ordering, page })
      .then(({ data }) => { if (!cancelled) setResult(data) })
      .catch(() => { if (!cancelled) setResult({ count: 0, results: [] }) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [token, search, state, category, ordering, page])

  if (!token) return <MembersOnly what="the latest government job openings" />

  const total = result?.count ?? 0
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const selectClass = 'rounded-lg border border-border bg-white px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20'
  // Any filter change returns to the first page.
  const onFilter = (setter) => (e) => { setter(e.target.value); setPage(1) }

  return (
    <div>
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative sm:w-72">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search post, exam or organisation..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="w-full rounded-lg border border-border bg-white py-2 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <select aria-label="State" value={state} onChange={onFilter(setState)} className={selectClass}>
          <option value="">All states</option>
          {states.map(s => <option key={s.state} value={s.state}>{s.state} ({s.count})</option>)}
        </select>
        <select aria-label="Category" value={category} onChange={onFilter(setCategory)} className={selectClass}>
          <option value="">All categories</option>
          {GOVT_JOB_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <select aria-label="Sort" value={ordering} onChange={onFilter(setOrdering)} className={selectClass}>
          {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {loading && !result ? (
        <Spinner />
      ) : total === 0 ? (
        <EmptyState
          title="No openings found"
          description={search || state || category ? 'Try a different keyword or clear the filters.' : 'New openings from UPSC, SSC, IBPS and RRB appear here as they are published.'}
        />
      ) : (
        <>
          <p className="mb-3 text-xs text-muted-foreground">{total.toLocaleString('en-IN')} opening{total === 1 ? '' : 's'}</p>
          <div className={`space-y-3 ${loading ? 'opacity-60' : ''}`}>
            {result.results.map(job => (
              <GovtJobCard
                key={job.id}
                job={job}
                prefix={prefix}
                save={isSeeker ? { saved: isSaved(job.id, 'govt'), pending: isPending(job.id, 'govt'), onToggle: () => toggleSave(job.id, 'govt') } : null}
              />
            ))}
          </div>
          {pages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-3 text-sm">
              <button type="button" onClick={() => setPage(p => p - 1)} disabled={page <= 1 || loading}
                className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 disabled:opacity-40">
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              <span className="text-muted-foreground">Page {page} of {pages}</span>
              <button type="button" onClick={() => setPage(p => p + 1)} disabled={page >= pages || loading}
                className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 disabled:opacity-40">
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
