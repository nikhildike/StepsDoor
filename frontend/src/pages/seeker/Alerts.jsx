/**
 * Alerts page — shared by job seekers and contractors.
 *
 * Route: `/seeker/alerts` (nested under the seeker account layout).
 * Access: any authenticated user.
 *
 * Job seekers see "Job Alerts": keyword/city/job-type/salary filters that
 * the backend `alerts` app matches against new private job postings.
 *
 * Contractors see "Tender Alerts": keyword/state/category/min-value filters
 * that the backend `match_tender_alerts` Celery task matches against new
 * scraped tenders.
 */
import { useEffect, useState } from 'react'
import { Bell, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { seekerService } from '@/services/seekerService'
import { tenderService } from '@/services/tenderService'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

// Options for the job alert's Job Type filter; empty value means "match any type".
const JOB_TYPES = [
  { value: '', label: 'Any type' },
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' },
]

// Options for the tender alert's Category filter; matches TenderCategory choices on the backend.
const TENDER_CATEGORIES = [
  { value: '', label: 'Any category' },
  { value: 'works', label: 'Works' },
  { value: 'goods', label: 'Goods' },
  { value: 'services', label: 'Services' },
  { value: 'consulting', label: 'Consulting' },
]

/**
 * Alert creation/management UI for contractor accounts (tender alerts).
 *
 * Filters: keyword, state, category, min_value. All are optional — leaving
 * all blank creates an alert that matches every new tender.
 *
 * @param {{ alerts: Array, onCreate: function, onToggle: function, onDelete: function, showForm: boolean, setShowForm: function, isSubmitting: boolean, register: function, handleSubmit: function, reset: function }} props
 */
function TenderAlertPanel({ alerts, onCreate, onToggle, onDelete, showForm, setShowForm, isSubmitting, register, handleSubmit, reset }) {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tender Alerts</h1>
          <p className="text-muted-foreground mt-1">Get notified when new matching tenders are posted.</p>
        </div>
        <Button onClick={() => setShowForm(v => !v)}>
          <Plus className="h-4 w-4 mr-1" /> New Alert
        </Button>
      </div>

      {/* Tender alert creation form */}
      {showForm && (
        <form onSubmit={handleSubmit(onCreate)} className="bg-white rounded-xl border border-border p-5 space-y-4">
          <h2 className="font-semibold text-sm">New Tender Alert</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Keyword</label>
              <Input {...register('keyword')} placeholder="e.g. road construction" className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">State</label>
              <Input {...register('state')} placeholder="e.g. Maharashtra" className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Category</label>
              <select
                {...register('category')}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {TENDER_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Min Value (₹)</label>
              <Input {...register('min_value')} type="number" placeholder="e.g. 1000000" className="mt-1" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Create Alert'}
            </Button>
            <Button type="button" variant="outline" onClick={() => { setShowForm(false); reset() }}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Alert list */}
      {alerts.length === 0 && !showForm ? (
        <div className="bg-white rounded-xl border border-border p-12 text-center text-muted-foreground">
          <Bell className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No tender alerts set up yet</p>
          <p className="text-sm mt-1">Create an alert to get notified about new tenders.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map(alert => (
            <div key={alert.id} className="bg-white rounded-xl border border-border p-4 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {alert.keyword && (
                    <span className="text-sm font-medium">"{alert.keyword}"</span>
                  )}
                  {alert.state && (
                    <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{alert.state}</span>
                  )}
                  {alert.category && (
                    <span className="text-xs bg-muted px-2 py-0.5 rounded-full capitalize">{alert.category}</span>
                  )}
                  {alert.min_value && (
                    <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                      ₹{(Number(alert.min_value) / 100000).toFixed(1)}L+ value
                    </span>
                  )}
                  {/* Fallback when the alert has no filters (matches every tender). */}
                  {!alert.keyword && !alert.state && !alert.category && !alert.min_value && (
                    <span className="text-sm text-muted-foreground">All tenders</span>
                  )}
                </div>
                <span className={`inline-flex items-center text-xs font-medium ${alert.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                  {alert.is_active ? '● Active' : '○ Paused'}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => onToggle(alert)} title={alert.is_active ? 'Pause' : 'Activate'} className="p-1.5 rounded hover:bg-muted transition-colors">
                  {alert.is_active
                    ? <ToggleRight className="h-5 w-5 text-green-600" />
                    : <ToggleLeft className="h-5 w-5 text-gray-400" />}
                </button>
                <button onClick={() => onDelete(alert.id)} title="Delete" className="p-1.5 rounded hover:bg-destructive/10 transition-colors">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Alert creation/management UI for job seeker accounts (job alerts).
 *
 * Filters: role keyword, city, job type, min salary. All optional.
 *
 * @param {{ alerts: Array, onCreate: function, onToggle: function, onDelete: function, showForm: boolean, setShowForm: function, isSubmitting: boolean, register: function, handleSubmit: function, reset: function }} props
 */
function JobAlertPanel({ alerts, onCreate, onToggle, onDelete, showForm, setShowForm, isSubmitting, register, handleSubmit, reset }) {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Job Alerts</h1>
          <p className="text-muted-foreground mt-1">Get notified when new matching jobs are posted.</p>
        </div>
        <Button onClick={() => setShowForm(v => !v)}>
          <Plus className="h-4 w-4 mr-1" /> New Alert
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit(onCreate)} className="bg-white rounded-xl border border-border p-5 space-y-4">
          <h2 className="font-semibold text-sm">New Job Alert</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Role / Keyword</label>
              <Input {...register('role_keyword')} placeholder="e.g. React Developer" className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">City</label>
              <Input {...register('city')} placeholder="e.g. Bangalore" className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Job Type</label>
              <select
                {...register('job_type')}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {JOB_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Min Salary (₹/yr)</label>
              <Input {...register('salary_min')} type="number" placeholder="e.g. 500000" className="mt-1" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Create Alert'}
            </Button>
            <Button type="button" variant="outline" onClick={() => { setShowForm(false); reset() }}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {alerts.length === 0 && !showForm ? (
        <div className="bg-white rounded-xl border border-border p-12 text-center text-muted-foreground">
          <Bell className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No alerts set up yet</p>
          <p className="text-sm mt-1">Create an alert to get notified about new jobs.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map(alert => (
            <div key={alert.id} className="bg-white rounded-xl border border-border p-4 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {alert.role_keyword && (
                    <span className="text-sm font-medium">"{alert.role_keyword}"</span>
                  )}
                  {alert.city && (
                    <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{alert.city}</span>
                  )}
                  {alert.job_type && (
                    <span className="text-xs bg-muted px-2 py-0.5 rounded-full capitalize">{alert.job_type.replace('_', ' ')}</span>
                  )}
                  {alert.salary_min && (
                    <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                      ₹{(alert.salary_min / 100000).toFixed(1)}L+ /yr
                    </span>
                  )}
                  {!alert.role_keyword && !alert.city && !alert.job_type && (
                    <span className="text-sm text-muted-foreground">All jobs</span>
                  )}
                </div>
                <span className={`inline-flex items-center text-xs font-medium ${alert.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                  {alert.is_active ? '● Active' : '○ Paused'}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => onToggle(alert)} title={alert.is_active ? 'Pause' : 'Activate'} className="p-1.5 rounded hover:bg-muted transition-colors">
                  {alert.is_active
                    ? <ToggleRight className="h-5 w-5 text-green-600" />
                    : <ToggleLeft className="h-5 w-5 text-gray-400" />}
                </button>
                <button onClick={() => onDelete(alert.id)} title="Delete" className="p-1.5 rounded hover:bg-destructive/10 transition-colors">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Page entry point: reads the user's role from the auth store and renders
 * either `TenderAlertPanel` (contractor) or `JobAlertPanel` (job seeker),
 * fetching only the alert type relevant to the current role.
 */
export default function Alerts() {
  const { user } = useAuthStore()
  const isContractor = !!user?.is_contractor

  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm()

  // Fetch the correct alert type based on role.
  useEffect(() => {
    const fetch = isContractor ? tenderService.alerts() : seekerService.alerts()
    fetch
      .then(res => setAlerts(res.data.results ?? res.data))
      .finally(() => setLoading(false))
  }, [isContractor])

  // Create handler — builds the payload appropriate for the alert type.
  const onCreate = async (data) => {
    let res
    if (isContractor) {
      res = await tenderService.createAlert({
        keyword: data.keyword || '',
        state: data.state || '',
        category: data.category || '',
        min_value: data.min_value ? Number(data.min_value) : null,
        is_active: true,
      })
    } else {
      res = await seekerService.createAlert({
        role_keyword: data.role_keyword || '',
        city: data.city || '',
        job_type: data.job_type || '',
        salary_min: data.salary_min ? parseInt(data.salary_min) : null,
        is_active: true,
      })
    }
    setAlerts(prev => [res.data, ...prev])
    reset()
    setShowForm(false)
  }

  // Toggle active/paused state — same shape for both alert types.
  const onToggle = async (alert) => {
    const update = isContractor
      ? tenderService.updateAlert?.(alert.id, { is_active: !alert.is_active })
      : seekerService.updateAlert(alert.id, { is_active: !alert.is_active })
    await update
    setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, is_active: !a.is_active } : a))
  }

  // Delete — same shape for both alert types.
  const onDelete = async (id) => {
    if (isContractor) await tenderService.deleteAlert(id)
    else await seekerService.deleteAlert(id)
    setAlerts(prev => prev.filter(a => a.id !== id))
  }

  if (loading) return <div className="text-muted-foreground">Loading...</div>

  // Shared props passed to whichever panel is rendered.
  const panelProps = { alerts, onCreate, onToggle, onDelete, showForm, setShowForm, isSubmitting, register, handleSubmit, reset }

  return isContractor
    ? <TenderAlertPanel {...panelProps} />
    : <JobAlertPanel {...panelProps} />
}
