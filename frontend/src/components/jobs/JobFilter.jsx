/**
 * JobFilter.jsx
 *
 * Filter control bar for job listing pages: a free-text search input plus
 * city and job-type dropdowns. It is a controlled/presentational component —
 * it holds no internal state itself, just reflects `filters` and reports
 * changes via `onChange`. Used above the job list on the public Jobs page
 * (and anywhere else a filterable job list is shown).
 */
import { Input } from '@/components/ui/Input'
import { JOB_TYPES, INDIAN_CITIES } from '@/utils/constants'

/**
 * JobFilter
 *
 * Controlled filter bar for the job listing pages. Renders a search box and
 * city/job-type selects; the parent owns the actual filter state.
 *
 * Props:
 * - filters (object, required) — current filter values, expected shape
 *   { search: string, city: string, job_type: string }.
 * - onChange (function, required) — called with a partial filter object
 *   (e.g. { search: 'value' }) whenever any control changes; the parent is
 *   responsible for merging it into its filter state.
 *
 * Used at the top of job listing pages (e.g. public Jobs page) to let users
 * narrow results by keyword, city, or job type.
 */
export function JobFilter({ filters, onChange }) {
  return (
    <div className="bg-white border rounded-lg p-4 flex flex-wrap gap-3">
      {/* Free-text search over job title / company name */}
      <Input
        placeholder="Search jobs or companies..."
        value={filters.search}
        onChange={(e) => onChange({ search: e.target.value })}
        className="flex-1 min-w-48"
      />
      {/* City filter — populated from the static INDIAN_CITIES list, empty value means "no filter" */}
      <select
        value={filters.city}
        onChange={(e) => onChange({ city: e.target.value })}
        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
      >
        <option value="">All Cities</option>
        {INDIAN_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      {/* Job type filter (full-time, part-time, etc.) — empty value means "no filter" */}
      <select
        value={filters.job_type}
        onChange={(e) => onChange({ job_type: e.target.value })}
        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
      >
        <option value="">All Types</option>
        {JOB_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>
    </div>
  )
}
