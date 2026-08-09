import { Input } from '@/components/ui/Input'
import { JOB_TYPES, INDIAN_CITIES } from '@/utils/constants'

export function JobFilter({ filters, onChange }) {
  return (
    <div className="bg-white border rounded-lg p-4 flex flex-wrap gap-3">
      <Input
        placeholder="Search jobs or companies..."
        value={filters.search}
        onChange={(e) => onChange({ search: e.target.value })}
        className="flex-1 min-w-48"
      />
      <select
        value={filters.city}
        onChange={(e) => onChange({ city: e.target.value })}
        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
      >
        <option value="">All Cities</option>
        {INDIAN_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
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
