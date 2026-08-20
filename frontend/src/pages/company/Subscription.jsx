/**
 * Company Subscription page.
 *
 * Route: `/dashboard/subscription` (nested under the company dashboard layout).
 * Also re-exported as-is by `pages/store/StoreSubscription.jsx` for the store
 * owner subscription route, since both flows share identical plan/billing logic.
 * Access: company accounts (and, via re-export, store-owner accounts) —
 * mounted behind `ProtectedRoute requireCompany` (or the store equivalent).
 *
 * Shows the current subscription status (active plan + expiry, or "no active
 * subscription"), and a grid of available plans the user can subscribe to.
 * Actual payment collection via Razorpay is not yet implemented — selecting a
 * plan just shows a placeholder alert.
 */
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { CheckCircle, CreditCard, Calendar, Briefcase, Zap } from 'lucide-react'
import { subscriptionService } from '@/services/subscriptionService'
import { Spinner } from '@/components/ui/Spinner'

// Feature bullet lists shown per plan tier, keyed by lowercased plan name.
// Falls back to featuresForPlan()'s index-based lookup when a plan's name
// doesn't match one of these known tier keys.
const TIER_FEATURES = {
  starter:    ['Click analytics per job', 'Branded career page', 'Email support'],
  growth:     ['Click analytics per job', 'Branded career page', 'Featured listings', 'Priority support'],
  enterprise: ['Click analytics per job', 'Branded career page', 'Featured listings', 'Dedicated account manager', 'Custom branding'],
}

// Resolves the feature bullet list for a plan card: matches by plan name first
// (e.g. "Growth" -> TIER_FEATURES.growth), otherwise falls back to picking a
// tier by the plan's position in the list (clamped to the available tier keys).
function featuresForPlan(plan, index) {
  const key = plan.name.toLowerCase()
  if (TIER_FEATURES[key]) return TIER_FEATURES[key]
  const keys = Object.keys(TIER_FEATURES)
  return TIER_FEATURES[keys[Math.min(index, keys.length - 1)]]
}

// Formats a numeric price as Indian Rupees with no decimal places (e.g. ₹1,999).
function formatPrice(price) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(price)
}

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
 * Renders subscription status (active plan/expiry or "no active subscription")
 * and a grid of subscribable plans. Handles being deep-linked from the Pricing
 * page with a pre-selected plan by auto-scrolling to the plans section.
 */
export default function Subscription() {
  const location = useLocation()
  // Available subscription plans fetched from the backend.
  const [plans, setPlans] = useState([])
  // Current subscription status: { active, subscription? }.
  const [current, setCurrent] = useState(null)   // { active, subscription? }
  // True while the initial plans + current-subscription fetch is in flight.
  const [loading, setLoading] = useState(true)
  // id of the plan currently being "subscribed" (used to show a per-card processing state).
  const [selecting, setSelecting] = useState(null) // plan id being "subscribed"

  // Fetches the list of available plans and the user's current subscription status in parallel.
  // GET /subscriptions/plans/ and GET /subscriptions/current/ (subscriptions app).
  // Falls back to `{ active: false }` if the current-subscription call fails (e.g. no subscription yet).
  useEffect(() => {
    Promise.all([
      subscriptionService.plans(),
      subscriptionService.current(),
    ]).then(([plansRes, currentRes]) => {
      setPlans(plansRes.data.results ?? plansRes.data)
      setCurrent(currentRes.data)
    }).catch(() => {
      setCurrent({ active: false })
    }).finally(() => setLoading(false))
  }, [])

  // If redirected from Pricing page with a pre-selected plan, scroll to plans
  useEffect(() => {
    if (location.state?.selectedPlanId && !loading) {
      document.getElementById('plans-section')?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [location.state, loading])

  // Handles clicking "Subscribe" on a plan card. Fires when the user picks a plan to subscribe to.
  // NOTE: this is a placeholder — actual Razorpay checkout is not yet wired up here; it just
  // shows an alert instructing the user to contact support instead of launching real payment.
  const handleSelectPlan = async (plan) => {
    // Razorpay integration placeholder
    setSelecting(plan.id)
    alert(`Razorpay payment for "${plan.name}" (₹${plan.price}) will be integrated here.\n\nFor now, contact support to activate your plan.`)
    setSelecting(null)
  }

  // Loading state: show a centered spinner until plans + subscription status have loaded.
  if (loading) return <div className="flex justify-center py-24"><Spinner /></div>

  const activeSub = current?.active ? current.subscription : null
  const remaining = activeSub ? daysLeft(activeSub.end_date) : null

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Subscription</h1>
        <p className="text-muted-foreground mt-1">Manage your plan and billing.</p>
      </div>

      {/* Current plan status: green banner with expiry/start details when subscribed, amber prompt otherwise. */}
      {activeSub ? (
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
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-4">
          <CreditCard className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-amber-900">No active subscription</p>
            <p className="text-sm text-amber-700 mt-0.5">Choose a plan below to publish job posts.</p>
          </div>
        </div>
      )}

      {/* Plan cards: only rendered once at least one plan has been fetched. */}
      {plans.length > 0 && (
        <div id="plans-section">
          <h2 className="text-lg font-semibold mb-4">{activeSub ? 'Change Plan' : 'Choose a Plan'}</h2>
          {/* Grid column count adapts to how many plans exist (1/2/3+ columns). */}
          <div className={`grid gap-5 ${plans.length === 1 ? '' : plans.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
            {/* Renders one pricing card per plan. */}
            {plans.map((plan, i) => {
              // Whether this card represents the user's currently active plan.
              const isCurrentPlan = activeSub?.plan === plan.id
              // Highlights the middle plan (or the 2nd of 3) as "Most Popular" when there's more than one plan.
              const isPopular = i === (plans.length === 3 ? 1 : Math.floor(plans.length / 2)) && plans.length > 1
              const features = featuresForPlan(plan, i)
              // Describes the plan's active job-posting cap; treats 999+ as "unlimited".
              const jobFeature = plan.job_limit >= 999
                ? 'Unlimited active job posts'
                : `Up to ${plan.job_limit} active job post${plan.job_limit !== 1 ? 's' : ''}`

              return (
                <div
                  key={plan.id}
                  className={`relative bg-white rounded-xl border p-6 flex flex-col ${
                    isCurrentPlan ? 'border-green-500 ring-1 ring-green-500' : isPopular ? 'border-primary shadow-md' : 'border-border'
                  }`}
                >
                  {/* "Current Plan" ribbon takes priority over "Most Popular" when both would apply. */}
                  {isCurrentPlan && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                      Current Plan
                    </span>
                  )}
                  {isPopular && !isCurrentPlan && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  )}

                  <div>
                    <h3 className="font-semibold text-base">{plan.name}</h3>
                    <p className="mt-2">
                      <span className="text-3xl font-bold">{formatPrice(plan.price)}</span>
                      <span className="text-muted-foreground text-sm ml-1">/ {plan.duration_days} days</span>
                    </p>
                  </div>

                  <ul className="mt-4 space-y-2 flex-1">
                    <li className="flex items-center gap-2 text-sm font-medium">
                      <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                      {jobFeature}
                    </li>
                    {/* Renders each feature bullet resolved by featuresForPlan(). */}
                    {features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {/* Subscribe button: disabled if this is already the active plan or a checkout is in progress;
                      styling and label vary by current/popular/default state. Triggers handleSelectPlan (Razorpay placeholder). */}
                  <button
                    onClick={() => handleSelectPlan(plan)}
                    disabled={isCurrentPlan || selecting === plan.id}
                    className={`mt-6 w-full py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      isCurrentPlan
                        ? 'bg-green-100 text-green-800 cursor-default'
                        : isPopular
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : 'border border-border hover:bg-muted'
                    }`}
                  >
                    {isCurrentPlan ? 'Current Plan' : selecting === plan.id ? 'Processing…' : 'Subscribe'}
                  </button>
                </div>
              )
            })}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Payments powered by Razorpay. You will be redirected to a secure payment page.
          </p>
        </div>
      )}

      {/* Empty state: backend returned no plans at all. */}
      {plans.length === 0 && (
        <p className="text-muted-foreground text-sm">No plans are available right now. Contact support.</p>
      )}
    </div>
  )
}
