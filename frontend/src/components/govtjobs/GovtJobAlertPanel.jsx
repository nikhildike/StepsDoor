/**
 * GovtJobAlertPanel.jsx
 *
 * Self-contained manager for the signed-in user's government job alerts
 * (GET/POST/PATCH/DELETE /api/govtjobs/alerts/): list with pause/resume and
 * delete, plus a "New alert" form for keyword, state and category. Matching
 * alerts are emailed and pushed daily by apps.govtjobs.tasks.match_govtjob_alerts.
 *
 * Rendered on the job seeker Alerts page (pages/seeker/Alerts.jsx, /seeker/alerts)
 * below the private Job Alerts panel. Owns its own state and form so it doesn't
 * interfere with the page's job-alert form.
 */
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Bell, Landmark, Plus, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react'
import { govtJobService } from '@/services/govtJobService'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { GOVT_JOB_CATEGORIES } from '@/components/govtjobs/LatestGovtJobs'

const CATEGORY_LABEL = Object.fromEntries(GOVT_JOB_CATEGORIES.map(c => [c.value, c.label]))

// State/UT names exactly as the scrapers store them (values of backend
// scrapers/state_map.py PORTAL_STATE_MAP), so an alert's state matches listings
// (case-insensitive). Offered even before any opening exists for a state.
const STATE_NAMES = [
  'Andaman & Nicobar', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh',
  'Dadra & Nagar Haveli and Daman & Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh',
  'Jammu & Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
]

// "Central Govt" first, then every state/UT alphabetically (including any new name the API reports).
function stateOptions(extra = []) {
  return ['Central Govt', ...Array.from(new Set([...STATE_NAMES, ...extra.filter(s => s && s !== 'Central Govt')])).sort()]
}
const selectClass =
  'mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

/**
 * GovtJobAlertPanel — no props. State options are "Central Govt" plus every
 * state/UT (STATE_NAMES), merged with any extra names GET /govtjobs/states/ reports,
 * because alerts match on the exact state names the scrapers store (case-insensitive).
 */
export function GovtJobAlertPanel() {
  const [alerts, setAlerts] = useState([])
  const [states, setStates] = useState(() => stateOptions())
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm()

  // Load the user's alerts and the state picker options; each may fail on its own.
  useEffect(() => {
    govtJobService.alerts()
      .then(({ data }) => setAlerts(data.results ?? data))
      .catch(() => setError('Could not load your government job alerts.'))
      .finally(() => setLoading(false))
    govtJobService.states()
      .then(({ data }) => setStates(stateOptions(data.map(s => s.state))))
      .catch(() => {})
  }, [])

  // Create an alert; blank fields mean "any".
  const onCreate = async (form) => {
    setError('')
    try {
      const { data } = await govtJobService.createAlert({
        keyword: (form.keyword || '').trim(),
        state: form.state || '',
        category: form.category || '',
        is_active: true,
      })
      setAlerts(prev => [data, ...prev])
      reset()
      setShowForm(false)
    } catch {
      setError('Could not create the alert. Please try again.')
    }
  }

  // Pause/resume — optimistic, reverted if the request fails.
  const onToggle = async (alert) => {
    const flip = (a) => (a.id === alert.id ? { ...a, is_active: !a.is_active } : a)
    setAlerts(prev => prev.map(flip))
    try {
      await govtJobService.updateAlert(alert.id, { is_active: !alert.is_active })
    } catch {
      setAlerts(prev => prev.map(flip))
      setError('Could not update the alert.')
    }
  }

  const onDelete = async (id) => {
    try {
      await govtJobService.deleteAlert(id)
      setAlerts(prev => prev.filter(a => a.id !== id))
    } catch {
      setError('Could not delete the alert.')
    }
  }

  return (
    <section className="space-y-4 max-w-2xl" aria-labelledby="govt-alerts-heading">
      <div className="flex items-center justify-between">
        <div>
          <h2 id="govt-alerts-heading" className="text-xl font-bold flex items-center gap-2">
            <Landmark className="h-5 w-5 text-primary" /> Government Job Alerts
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Get an email (and app notification) when UPSC, SSC, IBPS, RRB and other recruiters post matching openings.
          </p>
        </div>
        <Button onClick={() => setShowForm(v => !v)}>
          <Plus className="h-4 w-4 mr-1" /> New Alert
        </Button>
      </div>

      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

      {showForm && (
        <form onSubmit={handleSubmit(onCreate)} className="bg-white rounded-xl border border-border p-5 space-y-4">
          <h3 className="font-semibold text-sm">New Government Job Alert</h3>
          <div>
            <label htmlFor="govt-alert-keyword" className="text-xs font-medium text-muted-foreground">Post / exam keyword</label>
            <Input id="govt-alert-keyword" {...register('keyword')} placeholder="e.g. clerk, station master, SSC CGL" className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="govt-alert-state" className="text-xs font-medium text-muted-foreground">State</label>
              <select id="govt-alert-state" {...register('state')} className={selectClass}>
                <option value="">Any state</option>
                {states.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="govt-alert-category" className="text-xs font-medium text-muted-foreground">Category</label>
              <select id="govt-alert-category" {...register('category')} className={selectClass}>
                <option value="">Any category</option>
                {GOVT_JOB_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Create Alert'}</Button>
            <Button type="button" variant="outline" onClick={() => { setShowForm(false); reset() }}>Cancel</Button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : alerts.length === 0 && !showForm ? (
        <div className="bg-white rounded-xl border border-border p-10 text-center text-muted-foreground">
          <Bell className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No government job alerts yet</p>
          <p className="text-sm mt-1">Create one to hear about new recruitments as soon as they're published.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {alerts.map(alert => (
            <li key={alert.id} className="bg-white rounded-xl border border-border p-4 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {alert.keyword && <span className="text-sm font-medium">"{alert.keyword}"</span>}
                  {alert.state && <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{alert.state}</span>}
                  {alert.category && (
                    <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{CATEGORY_LABEL[alert.category] || alert.category}</span>
                  )}
                  {!alert.keyword && !alert.state && !alert.category && (
                    <span className="text-sm text-muted-foreground">All government jobs</span>
                  )}
                </div>
                <span className={`inline-flex items-center text-xs font-medium ${alert.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                  {alert.is_active ? '● Active' : '○ Paused'}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => onToggle(alert)} aria-label={alert.is_active ? 'Pause alert' : 'Resume alert'}
                  className="p-1.5 rounded hover:bg-muted transition-colors">
                  {alert.is_active ? <ToggleRight className="h-5 w-5 text-green-600" /> : <ToggleLeft className="h-5 w-5 text-gray-400" />}
                </button>
                <button onClick={() => onDelete(alert.id)} aria-label="Delete alert"
                  className="p-1.5 rounded hover:bg-destructive/10 transition-colors">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
