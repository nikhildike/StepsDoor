/**
 * LatestCompanyJobs.jsx
 *
 * Members-only list of openings read from private companies' own careers pages
 * (GET /api/careers/jobs/ — Greenhouse, Lever, Workday and Oracle feeds, India
 * jobs only). Keyword search, city and company filters, and paging; each card links out to
 * the job on the company's own site, where the seeker applies.
 *
 * Rendered on pages/public/Companies.jsx, i.e. /companies and, in the student
 * dashboard, /seeker/companies. Guests get the MembersOnly prompt and no request
 * is made (the API 401s anonymous calls). Separate from the govt jobs list.
 */
import { useEffect, useState } from 'react'
import { Briefcase, ChevronLeft, ChevronRight, ExternalLink, MapPin, Search } from 'lucide-react'
import { careerService } from '@/services/careerService'
import { useAuthStore } from '@/store/authStore'
import { useSavedJobs } from '@/hooks/useSavedJobs'
import { SaveJobButton } from '@/components/jobs/SaveJobButton'
import { MembersOnly } from '@/components/ui/MembersOnly'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { timeAgo } from '@/utils/formatDate'

const PAGE_SIZE = 20 // the backend's default page size (core/pagination.py)

/**
 * One opening: title, company, location / team / type facts, when it was
 * posted, a save toggle (`save` = {saved, pending, onToggle}, omitted for
 * non-seeker accounts) and an "Apply on company site" link (opens the ATS page
 * in a new tab).
 */
function CompanyJobCard({ job, save }) {
  const facts = [job.department, job.employment_type].filter(Boolean)
  // Standard city names read better than raw ATS text (often an office address); fall back to the text.
  const place = job.cities?.length ? job.cities.join(', ') : job.location
  return (
    <div className="rounded-lg border border-border bg-white p-4 transition-shadow hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <a href={job.apply_url} target="_blank" rel="noopener noreferrer"
          className="text-sm font-medium text-foreground hover:text-primary line-clamp-2">
          {job.title}
        </a>
        <div className="flex shrink-0 items-center gap-1">
          {job.posted_at && <span className="text-xs text-muted-foreground">{timeAgo(job.posted_at)}</span>}
          {save && <SaveJobButton {...save} />}
        </div>
      </div>
      <p className="mt-1 text-xs font-medium text-muted-foreground line-clamp-1">{job.company_name}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {place && <span className="flex items-center gap-1" title={job.location}><MapPin className="h-3 w-3" /><span className="line-clamp-1">{place}</span></span>}
        {facts.length > 0 && <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" />{facts.join(' · ')}</span>}
      </div>
      <div className="mt-3">
        <a href={job.apply_url} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90">
          Apply on company site <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  )
}

/**
 * LatestCompanyJobs
 *
 * Section heading, filter bar and paged list of company openings. No props;
 * reads the auth token to choose between the list and the sign-in prompt.
 */
export function LatestCompanyJobs() {
  const { token } = useAuthStore()
  const { isSaved, toggleSave, isPending, isSeeker } = useSavedJobs() // save toggles on the cards
  const [searchInput, setSearchInput] = useState('') // what's typed; applied after a pause
  const [search, setSearch] = useState('')           // applied keyword sent to the API
  const [company, setCompany] = useState('')         // CareerSource id, '' = all companies
  const [city, setCity] = useState('')               // standard city name, '' = all cities
  const [cities, setCities] = useState([])           // [{city, count}] for the city picker
  const [page, setPage] = useState(1)
  const [companies, setCompanies] = useState([])     // [{id, company_name, job_count}] for the picker
  const [result, setResult] = useState(null)         // last API page: {count, results}
  const [loading, setLoading] = useState(false)

  // Apply the search box 400 ms after typing stops, back on page 1.
  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput.trim()); setPage(1) }, 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Company picker options (only companies with open jobs).
  useEffect(() => {
    if (!token) return
    careerService.companies().then(({ data }) => setCompanies(data)).catch(() => setCompanies([]))
  }, [token])

  // City picker options (only cities with open jobs).
  useEffect(() => {
    if (!token) return
    careerService.cities().then(({ data }) => setCities(data)).catch(() => setCities([]))
  }, [token])

  // The list — refetched whenever the keyword, a filter or the page changes.
  useEffect(() => {
    if (!token) return
    let cancelled = false
    setLoading(true)
    careerService
      .list({ search: search || undefined, city: city || undefined, company: company || undefined, page })
      .then(({ data }) => { if (!cancelled) setResult(data) })
      .catch(() => { if (!cancelled) setResult({ count: 0, results: [] }) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [token, search, city, company, page])

  const heading = (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-1">
        <Briefcase className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">Latest openings from company careers pages</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Jobs in India from companies&apos; own careers sites, refreshed twice a day. You apply on the company&apos;s site.
      </p>
    </div>
  )

  if (!token) {
    return <section>{heading}<MembersOnly what="the latest openings at top companies" source="company careers pages" /></section>
  }

  const total = result?.count ?? 0
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <section>
      {heading}
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative sm:w-72">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search role, company or city..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="w-full rounded-lg border border-border bg-white py-2 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <select aria-label="City" value={city} onChange={e => { setCity(e.target.value); setPage(1) }}
          className="rounded-lg border border-border bg-white px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
          <option value="">All cities</option>
          {cities.map(c => <option key={c.city} value={c.city}>{c.city} ({c.count})</option>)}
        </select>
        <select aria-label="Company" value={company} onChange={e => { setCompany(e.target.value); setPage(1) }}
          className="rounded-lg border border-border bg-white px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
          <option value="">All companies</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.company_name} ({c.job_count})</option>)}
        </select>
      </div>

      {loading && !result ? (
        <Spinner />
      ) : total === 0 ? (
        <EmptyState
          title="No openings found"
          description={search || city || company ? 'Try a different keyword or clear the filters.' : 'Openings from company careers pages appear here after the next refresh.'}
        />
      ) : (
        <>
          <p className="mb-3 text-xs text-muted-foreground">{total.toLocaleString('en-IN')} opening{total === 1 ? '' : 's'}</p>
          <div className={`grid gap-3 md:grid-cols-2 ${loading ? 'opacity-60' : ''}`}>
            {result.results.map(job => (
              <CompanyJobCard
                key={job.id}
                job={job}
                save={isSeeker ? { saved: isSaved(job.id, 'company'), pending: isPending(job.id, 'company'), onToggle: () => toggleSave(job.id, 'company') } : null}
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
    </section>
  )
}
