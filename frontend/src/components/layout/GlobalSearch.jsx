/**
 * GlobalSearch.jsx
 *
 * Site-wide search box, rendered inside Navbar (desktop header). Lets a user
 * type a query and see a live dropdown of matches grouped by content type —
 * Jobs (fetched from the backend), Companies, Tenders, Govt Jobs, Shopping,
 * Retail Stores, and Services (matched client-side against static directory
 * data imported from the corresponding public pages). Clicking a result
 * navigates to it; pressing Enter or "View all job results" routes to the
 * full Jobs listing page pre-filtered by the query.
 */
import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Search, X, Briefcase, Building2, Landmark, FileText, ShoppingBag, Store, Wrench, Loader2 } from 'lucide-react'
import { jobService } from '@/services/jobService'
import { companyService } from '@/services/companyService'
import { useJobStore } from '@/store/jobStore'
import { COMPANY_DIRECTORY } from '@/pages/public/Companies'
import { CENTRAL_PORTALS, STATE_TENDERS } from '@/pages/public/Tenders'
import { CENTRAL_BODIES, ALL_STATE_DEPTS } from '@/pages/public/GovtJobs'
import { ALL_STORES } from '@/pages/public/Shopping'
import { ALL_RETAIL_STORES } from '@/pages/public/RetailStores'
import { ALL_PROVIDERS } from '@/pages/public/Services'

// Cap on how many results are shown per result category in the dropdown,
// to keep the panel from growing unbounded for broad queries.
const MAX_PER_SECTION = 4

/**
 * GlobalSearch
 *
 * Site-wide search input with a live multi-category results dropdown.
 *
 * Props: none — manages its own query/open/result state internally and
 * reads/writes global job filters via useJobStore.
 *
 * Used inside Navbar (desktop-only header), giving users one search box that
 * covers jobs, companies, tenders, govt jobs, shopping, retail stores, and
 * services from anywhere in the public site.
 */
export default function GlobalSearch() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [jobResults, setJobResults] = useState([])
  const [jobsLoading, setJobsLoading] = useState(false)
  const [registeredCompanies, setRegisteredCompanies] = useState([])
  const containerRef = useRef(null)
  const navigate = useNavigate()
  const setJobFilters = useJobStore(s => s.setFilters)

  // Load registered (paying) companies once on mount so they can be matched against
  // search queries client-side alongside the static COMPANY_DIRECTORY list.
  useEffect(() => {
    companyService.list().then(({ data }) => setRegisteredCompanies(data.results ?? data)).catch(() => {})
  }, []) // empty deps: run once on mount

  // Debounced backend job search: waits 300ms after the user stops typing before
  // hitting the API, and cancels any pending request if the query changes again first.
  useEffect(() => {
    const q = query.trim()
    if (!q) { setJobResults([]); return }
    setJobsLoading(true)
    const t = setTimeout(() => {
      jobService.list({ search: q, page: 1 })
        .then(({ data }) => setJobResults((data.results ?? data).slice(0, MAX_PER_SECTION)))
        .catch(() => setJobResults([]))
        .finally(() => setJobsLoading(false))
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  // Closes the results dropdown when the user clicks anywhere outside the search
  // container (click-outside-to-dismiss behavior).
  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const q = query.trim().toLowerCase()
  const isSearching = q.length > 0

  // Companies: merge registered (paying) companies with the static directory,
  // tagging each with its `kind` so ResultItem knows whether to link internally
  // (registered -> /careers/:slug) or externally (directory -> c.url).
  const matchedCompanies = isSearching
    ? [
        ...registeredCompanies.filter(c => c.name.toLowerCase().includes(q)).map(c => ({ kind: 'registered', ...c })),
        ...COMPANY_DIRECTORY.filter(c => c.name.toLowerCase().includes(q) || c.sector.toLowerCase().includes(q)).map(c => ({ kind: 'directory', ...c })),
      ].slice(0, MAX_PER_SECTION)
    : []

  // Tenders: central portals + state tenders (state tenders are normalized to
  // have a `category` field, reusing their `state` value, so both lists share
  // the same filter/match shape).
  const matchedTenders = isSearching
    ? [...CENTRAL_PORTALS, ...STATE_TENDERS.map(s => ({ ...s, category: s.state }))]
        .filter(t => t.name.toLowerCase().includes(q) || (t.category || '').toLowerCase().includes(q))
        .slice(0, MAX_PER_SECTION)
    : []

  // Govt jobs: central recruiting bodies + all state departments, matched against name/category/state
  const matchedGovtJobs = isSearching
    ? [...CENTRAL_BODIES, ...ALL_STATE_DEPTS]
        .filter(g => g.name.toLowerCase().includes(q) || g.category.toLowerCase().includes(q) || (g.state || '').toLowerCase().includes(q))
        .slice(0, MAX_PER_SECTION)
    : []

  // Shopping directory match (static data imported from the Shopping page)
  const matchedShopping = isSearching
    ? ALL_STORES.filter(s => s.name.toLowerCase().includes(q) || s.groupLabel.toLowerCase().includes(q)).slice(0, MAX_PER_SECTION)
    : []

  // Retail stores directory match (static data imported from the RetailStores page)
  const matchedRetail = isSearching
    ? ALL_RETAIL_STORES.filter(s => s.name.toLowerCase().includes(q) || s.groupLabel.toLowerCase().includes(q)).slice(0, MAX_PER_SECTION)
    : []

  // Services/providers directory match (static data imported from the Services page)
  const matchedServices = isSearching
    ? ALL_PROVIDERS.filter(p => p.name.toLowerCase().includes(q) || p.groupLabel.toLowerCase().includes(q)).slice(0, MAX_PER_SECTION)
    : []

  // Combined result count across all categories — used to decide whether to show
  // the "no results" empty state vs. the grouped results list.
  const totalResults = jobResults.length + matchedCompanies.length + matchedTenders.length +
    matchedGovtJobs.length + matchedShopping.length + matchedRetail.length + matchedServices.length

  // Navigates to the full Jobs listing page pre-filtered by the current query.
  // Fires on Enter keypress or when the "View all job results" link is clicked.
  function goToJobs() {
    if (!query.trim()) return
    setJobFilters({ search: query.trim() })
    navigate('/jobs')
    setOpen(false)
  }

  // Keyboard shortcuts on the search input: Enter jumps to full job results,
  // Escape closes the dropdown without clearing the query.
  function handleKeyDown(e) {
    if (e.key === 'Enter') goToJobs()
    if (e.key === 'Escape') setOpen(false)
  }

  // Clears the query text and any previously fetched job results (the "X" button handler)
  function clear() {
    setQuery('')
    setJobResults([])
  }

  return (
    <div ref={containerRef} className="relative w-56">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search everything..."
          className="w-full pl-8 pr-7 py-1.5 text-sm border border-border rounded-md bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-colors"
        />
        {/* Clear ("X") button only appears once the user has typed something */}
        {query && (
          <button onClick={clear} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Results dropdown: only rendered while open and there's an active query */}
      {open && isSearching && (
        <div className="absolute mt-1 w-96 max-w-[90vw] right-0 bg-white border border-border rounded-lg shadow-lg max-h-[70vh] overflow-y-auto z-50">
          {jobsLoading && totalResults === 0 ? (
            // Loading state: shown only while the debounced job search is in flight and nothing has matched yet
            <div className="p-4 flex items-center justify-center text-muted-foreground text-sm gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Searching...
            </div>
          ) : totalResults === 0 ? (
            // Empty state: no matches found across any category
            <div className="p-4 text-center text-sm text-muted-foreground">No results for &ldquo;{query}&rdquo;</div>
          ) : (
            <div className="py-1">
              {/* Backend job search results */}
              <ResultSection title="Jobs" icon={Briefcase}>
                {jobResults.map(job => (
                  <ResultItem key={`job-${job.id}`} onClick={() => setOpen(false)} to={`/jobs/${job.id}`} title={job.title} subtitle={job.company_name} />
                ))}
              </ResultSection>

              {/* Company matches: registered companies link internally to their careers page, directory-only companies link externally */}
              <ResultSection title="Companies" icon={Building2}>
                {matchedCompanies.map(c => c.kind === 'registered'
                  ? <ResultItem key={`co-r-${c.id}`} onClick={() => setOpen(false)} to={`/careers/${c.slug}`} title={c.name} subtitle="Hiring on StepsDoor" />
                  : <ResultItem key={`co-d-${c.name}`} onClick={() => setOpen(false)} href={c.url} title={c.name} subtitle={c.sector} />
                )}
              </ResultSection>

              <ResultSection title="Tenders" icon={Landmark}>
                {matchedTenders.map(t => (
                  <ResultItem key={`t-${t.name}`} onClick={() => setOpen(false)} href={t.url} title={t.name} subtitle={t.category} />
                ))}
              </ResultSection>

              <ResultSection title="Govt Jobs" icon={FileText}>
                {matchedGovtJobs.map(g => (
                  <ResultItem key={`g-${g.state || ''}-${g.name}`} onClick={() => setOpen(false)} href={g.url} title={g.name} subtitle={g.state ? `${g.state} — ${g.category}` : g.category} />
                ))}
              </ResultSection>

              <ResultSection title="Shopping" icon={ShoppingBag}>
                {matchedShopping.map(s => (
                  <ResultItem key={`sh-${s.name}`} onClick={() => setOpen(false)} href={s.url} title={s.name} subtitle={s.groupLabel} />
                ))}
              </ResultSection>

              <ResultSection title="Retail Stores" icon={Store}>
                {matchedRetail.map(s => (
                  <ResultItem key={`re-${s.name}`} onClick={() => setOpen(false)} href={s.url} title={s.name} subtitle={s.groupLabel} />
                ))}
              </ResultSection>

              <ResultSection title="Services" icon={Wrench}>
                {matchedServices.map(p => (
                  <ResultItem key={`sv-${p.name}`} onClick={() => setOpen(false)} href={p.url} title={p.name} subtitle={p.groupLabel} />
                ))}
              </ResultSection>

              {/* Footer link to jump to the full (non-truncated) job search results page */}
              <button
                onClick={goToJobs}
                className="w-full text-left px-3 py-2 text-xs font-medium text-primary hover:bg-primary/5 border-t transition-colors"
              >
                View all job results for &ldquo;{query}&rdquo; →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * ResultSection
 *
 * Internal helper that renders a labeled group of results (with a category
 * icon and heading) inside the GlobalSearch dropdown, and renders nothing at
 * all when it has no children — so empty categories don't leave stray
 * headings in the results list.
 *
 * Props:
 * - title (string) — category heading, e.g. "Jobs", "Companies".
 * - icon (component) — lucide-react icon shown next to the heading.
 * - children (node | node[]) — the ResultItem elements for this category.
 */
function ResultSection({ title, icon: Icon, children }) {
  // Normalize children to an array and drop any falsy entries so we can check length reliably
  const items = (Array.isArray(children) ? children : [children]).filter(Boolean)
  if (items.length === 0) return null
  return (
    <div className="py-1">
      <p className="px-3 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
        <Icon className="h-3 w-3" /> {title}
      </p>
      {items}
    </div>
  )
}

/**
 * ResultItem
 *
 * Internal helper rendering a single row in the GlobalSearch results
 * dropdown. Renders as an internal <Link> when `to` is given (in-app route,
 * e.g. a job or careers page), or as an external <a target="_blank"> when
 * `href` is given instead (static directory entries that point off-site).
 *
 * Props:
 * - to (string, optional) — internal route path; takes priority over `href`.
 * - href (string, optional) — external URL, used when `to` is not provided.
 * - title (string) — primary result label.
 * - subtitle (string, optional) — secondary descriptive text.
 * - onClick (function, optional) — fires on click, used by callers to close the dropdown.
 */
function ResultItem({ to, href, title, subtitle, onClick }) {
  const className = 'flex flex-col px-3 py-1.5 hover:bg-gray-50 transition-colors'
  const content = (
    <>
      <span className="text-sm text-foreground truncate">{title}</span>
      {subtitle && <span className="text-xs text-muted-foreground truncate">{subtitle}</span>}
    </>
  )
  // Internal navigation takes precedence when a route (`to`) is supplied
  if (to) {
    return <Link to={to} onClick={onClick} className={className}>{content}</Link>
  }
  // Otherwise fall back to an external link opened in a new tab
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" onClick={onClick} className={className}>{content}</a>
  )
}
