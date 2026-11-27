/**
 * HiringCompanies.jsx
 *
 * Compact "Hiring on StepsDoor" row of companies with an active StepsDoor
 * subscription and live jobs (GET /api/companies/ via companyService). Each card
 * opens that company's branded careers page on StepsDoor (`/careers/:slug`, or
 * `/seeker/careers/:slug` inside the student dashboard).
 *
 * Part of the single "Browse Jobs" block on the Jobs page (pages/public/Jobs.jsx
 * — /jobs and the dashboard's /seeker/browse-jobs), between the filter bar and
 * the job results. It has no search box of its own: the Jobs search text also
 * narrows the companies. Renders nothing while loading or when no company
 * matches, so the page shows a single empty state (the jobs one).
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2 } from 'lucide-react'
import { companyService } from '@/services/companyService'
import { useListingPrefix } from '@/hooks/useDashboardBase'

/**
 * Card for one subscriber company: logo (or placeholder), name and open-position
 * count. `onClick` opens the company's StepsDoor careers page.
 */
function CompanyCard({ company, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-border rounded-lg p-3 hover:shadow-md transition-shadow flex items-center gap-3"
    >
      {company.logo ? (
        <img src={company.logo} alt={company.name} className="h-10 w-10 rounded-md object-cover shrink-0" />
      ) : (
        <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center shrink-0">
          <Building2 className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{company.name}</p>
        <p className="text-xs font-medium text-primary">
          {company.active_job_count} open position{company.active_job_count !== 1 ? 's' : ''}
        </p>
      </div>
    </button>
  )
}

/**
 * HiringCompanies
 *
 * Props:
 * - search (string, optional) — the Jobs page's search text; companies whose
 *   name or description contains it are shown.
 */
export function HiringCompanies({ search = '' }) {
  const navigate = useNavigate()
  const prefix = useListingPrefix() // '/seeker' inside the dashboard, so careers pages open there too
  const [companies, setCompanies] = useState([]) // subscriber companies with live jobs, from the API

  // Fetch the subscriber companies once on mount.
  useEffect(() => {
    companyService.list()
      .then(({ data }) => setCompanies(data.results ?? data))
      .catch(() => setCompanies([]))
  }, [])

  const q = search.trim().toLowerCase()
  const shown = q
    ? companies.filter(c => c.name.toLowerCase().includes(q) || (c.description && c.description.toLowerCase().includes(q)))
    : companies
  if (shown.length === 0) return null

  return (
    <div className="mt-6">
      <p className="mb-2 text-sm font-medium text-muted-foreground">
        Hiring on StepsDoor <span className="font-normal">({shown.length} compan{shown.length !== 1 ? 'ies' : 'y'})</span>
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {shown.map(company => (
          <CompanyCard
            key={company.id}
            company={company}
            onClick={() => navigate(`${prefix}/careers/${company.slug}`)}
          />
        ))}
      </div>
    </div>
  )
}
