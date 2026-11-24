/**
 * LatestTenders.jsx
 *
 * Members-only browse list of scraped government tenders (GET /api/tenders/),
 * with keyword search, state and category filters, a newest / closing-soon sort,
 * and paging. Rendered as the "Latest tenders" view of pages/public/Tenders.jsx
 * (mounted at /tenders and, inside the contractor sidebar, /seeker/tenders).
 * Guests get the MembersOnly sign-in prompt and no request is made — the API
 * 401s anonymous calls and api.js would bounce them to /login.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock, MapPin, IndianRupee, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { tenderService } from '@/services/tenderService'
import { useAuthStore } from '@/store/authStore'
import { MembersOnly } from '@/components/ui/MembersOnly'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { formatDate } from '@/utils/formatDate'

// Mirrors backend apps.tenders.models.TenderCategory.
const CATEGORIES = [
  { value: 'civil', label: 'Civil Works' },
  { value: 'it', label: 'IT & Software' },
  { value: 'supply', label: 'Supply of Goods' },
  { value: 'transport', label: 'Transport' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'education', label: 'Education' },
  { value: 'defence', label: 'Defence' },
  { value: 'power', label: 'Power & Energy' },
  { value: 'other', label: 'Other' },
]
const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map(c => [c.value, c.label]))

// Sort options → the API's ?ordering= values (see TenderViewSet.ordering_fields).
const SORTS = [
  { value: '-published_at', label: 'Newest first' },
  { value: 'submission_deadline', label: 'Closing soon' },
  { value: '-estimated_value', label: 'Highest value' },
]

const PAGE_SIZE = 20 // matches the backend's default page size (core/pagination.py)

// "₹12,28,141" — Indian digit grouping; null when there's no value so the row hides it.
function formatINR(amount) {
  if (!amount) return null
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
}

/**
 * One tender row: title links to /tenders/:id; organisation, state/district,
 * category, value and closing date underneath.
 */
function TenderRow({ tender }) {
  const value = formatINR(tender.estimated_value)
  return (
    <Link
      to={`/tenders/${tender.id}`}
      className="block rounded-lg border border-border bg-white p-4 transition-shadow hover:shadow-sm"
    >
      <p className="text-sm font-medium text-foreground line-clamp-2">{tender.title}</p>
      <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{tender.organisation}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <MapPin className="h-3 w-3" />{[tender.district, tender.state].filter(Boolean).join(', ')}
        </span>
        {value && <span className="flex items-center gap-1"><IndianRupee className="h-3 w-3" />{value.replace('₹', '')}</span>}
        {tender.submission_deadline && (
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Closes {formatDate(tender.submission_deadline)}</span>
        )}
        {CATEGORY_LABEL[tender.category] && (
          <span className="rounded bg-muted px-1.5 py-0.5">{CATEGORY_LABEL[tender.category]}</span>
        )}
      </div>
    </Link>
  )
}

/**
 * LatestTenders
 *
 * Filter bar + paged list of active scraped tenders. No props; reads the auth
 * token to decide between the list and the sign-in prompt.
 */
export function LatestTenders() {
  const { token } = useAuthStore()
  const [searchInput, setSearchInput] = useState('') // what's typed; applied after a pause
  const [search, setSearch] = useState('')
  const [state, setState] = useState('')
  const [category, setCategory] = useState('')
  const [ordering, setOrdering] = useState(SORTS[0].value)
  const [page, setPage] = useState(1)
  const [states, setStates] = useState([])     // [{state, count}] for the state picker
  const [result, setResult] = useState(null)   // last API page: {count, results}
  const [loading, setLoading] = useState(false)

  // Apply the search box 400 ms after typing stops, and go back to page 1.
  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput.trim()); setPage(1) }, 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  // State picker options (only states that currently have tenders).
  useEffect(() => {
    if (!token) return
    tenderService.states().then(({ data }) => setStates(data)).catch(() => setStates([]))
  }, [token])

  // The list itself — refetched whenever a filter, the sort or the page changes.
  useEffect(() => {
    if (!token) return
    let cancelled = false
    setLoading(true)
    tenderService
      .list({ search: search || undefined, state: state || undefined, category: category || undefined, ordering, page })
      .then(({ data }) => { if (!cancelled) setResult(data) })
      .catch(() => { if (!cancelled) setResult({ count: 0, results: [] }) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [token, search, state, category, ordering, page])

  if (!token) return <MembersOnly what="the latest government tenders" />

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
            placeholder="Search title or organisation..."
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
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <select aria-label="Sort" value={ordering} onChange={onFilter(setOrdering)} className={selectClass}>
          {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {loading && !result ? (
        <Spinner />
      ) : total === 0 ? (
        <EmptyState title="No tenders found" description="Try a different keyword or clear the filters." />
      ) : (
        <>
          <p className="mb-3 text-xs text-muted-foreground">{total.toLocaleString('en-IN')} open tender{total === 1 ? '' : 's'}</p>
          <div className={`space-y-3 ${loading ? 'opacity-60' : ''}`}>
            {result.results.map(t => <TenderRow key={t.id} tender={t} />)}
          </div>
          {pages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-3 text-sm">
              <button
                type="button"
                onClick={() => setPage(p => p - 1)}
                disabled={page <= 1 || loading}
                className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              <span className="text-muted-foreground">Page {page} of {pages}</span>
              <button
                type="button"
                onClick={() => setPage(p => p + 1)}
                disabled={page >= pages || loading}
                className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 disabled:opacity-40"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
