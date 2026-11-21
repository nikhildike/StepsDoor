/**
 * Company Subscription page.
 *
 * Route: `/dashboard/subscription` (nested under the company dashboard layout).
 * Also re-exported as-is by `pages/store/StoreSubscription.jsx` for the store
 * owner subscription route, so this one file covers both account types.
 * Access: company accounts (and, via re-export, store-owner accounts) —
 * mounted behind `ProtectedRoute requireCompany` (or the store equivalent).
 *
 * Paid plans are not launched yet, so this page shows a "coming soon /
 * free for now" notice instead of the plan grid. If the account already has
 * an active subscription (e.g. one activated manually by an admin), its
 * status is still shown. The previous plan-grid version lives in git
 * history — restore it from there when pricing goes live.
 */
import { useEffect, useState } from 'react'
import { Calendar, Briefcase, Zap, Clock } from 'lucide-react'
import { subscriptionService } from '@/services/subscriptionService'
import { Spinner } from '@/components/ui/Spinner'

// Formats a date string/ISO value as "18 Aug 2026"-style Indian locale date, or an em dash if missing.
function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Computes the number of whole days remaining until endDate (clamped to 0), or null if no end date.
function daysLeft(endDate) {
  if (!endDate) return null
  const diff = new Date(endDate) - Date.now()
  return Math.max(0, Math.ceil(diff / 86400000))
}

/**
 * Renders the "plans coming soon, free for now" notice, plus the current
 * subscription's status when the account already has an active one.
 */
export default function Subscription() {
  // Current subscription status: { active, subscription? }.
  const [current, setCurrent] = useState(null)
  // True while the current-subscription fetch is in flight.
  const [loading, setLoading] = useState(true)

  // GET /subscriptions/current/ — falls back to `{ active: false }` on error
  // (e.g. the account has never had a subscription).
  useEffect(() => {
    subscriptionService.current()
      .then(res => setCurrent(res.data))
      .catch(() => setCurrent({ active: false }))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-24"><Spinner /></div>

  const activeSub = current?.active ? current.subscription : null
  const remaining = activeSub ? daysLeft(activeSub.end_date) : null

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Subscription</h1>
        <p className="text-muted-foreground mt-1">Manage your plan and billing.</p>
      </div>

      {/* Existing subscribers still see their plan and expiry */}
      {activeSub && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex items-start gap-4">
          <Zap className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-green-900">Active — {activeSub.plan_name ?? 'Plan'}</p>
            <div className="mt-2 flex flex-wrap gap-5 text-sm text-green-800">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                Expires {formatDate(activeSub.end_date)}
                {remaining !== null && <span className="font-medium">({remaining} day{remaining !== 1 ? 's' : ''} left)</span>}
              </span>
              <span className="flex items-center gap-1.5">
                <Briefcase className="h-4 w-4" />
                Started {formatDate(activeSub.start_date)}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-border rounded-xl p-8 text-center">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium px-4 py-1.5 rounded-full mb-4">
          <Clock className="h-4 w-4" /> Coming soon
        </div>
        <h2 className="text-xl font-semibold">Paid plans are coming soon</h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
          Until then, StepsDoor is completely free — post jobs and manage your listing without a subscription.
        </p>
      </div>
    </div>
  )
}
