import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { CheckCircle, CreditCard, Calendar, Briefcase, Zap } from 'lucide-react'
import { subscriptionService } from '@/services/subscriptionService'
import { Spinner } from '@/components/ui/Spinner'

const TIER_FEATURES = {
  starter:    ['Click analytics per job', 'Branded career page', 'Email support'],
  growth:     ['Click analytics per job', 'Branded career page', 'Featured listings', 'Priority support'],
  enterprise: ['Click analytics per job', 'Branded career page', 'Featured listings', 'Dedicated account manager', 'Custom branding'],
}

function featuresForPlan(plan, index) {
  const key = plan.name.toLowerCase()
  if (TIER_FEATURES[key]) return TIER_FEATURES[key]
  const keys = Object.keys(TIER_FEATURES)
  return TIER_FEATURES[keys[Math.min(index, keys.length - 1)]]
}

function formatPrice(price) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(price)
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function daysLeft(endDate) {
  if (!endDate) return null
  const diff = new Date(endDate) - Date.now()
  return Math.max(0, Math.ceil(diff / 86400000))
}

export default function Subscription() {
  const location = useLocation()
  const [plans, setPlans] = useState([])
  const [current, setCurrent] = useState(null)   // { active, subscription? }
  const [loading, setLoading] = useState(true)
  const [selecting, setSelecting] = useState(null) // plan id being "subscribed"

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

  const handleSelectPlan = async (plan) => {
    // Razorpay integration placeholder
    setSelecting(plan.id)
    alert(`Razorpay payment for "${plan.name}" (₹${plan.price}) will be integrated here.\n\nFor now, contact support to activate your plan.`)
    setSelecting(null)
  }

  if (loading) return <div className="flex justify-center py-24"><Spinner /></div>

  const activeSub = current?.active ? current.subscription : null
  const remaining = activeSub ? daysLeft(activeSub.end_date) : null

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Subscription</h1>
        <p className="text-muted-foreground mt-1">Manage your plan and billing.</p>
      </div>

      {/* Current plan status */}
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

      {/* Plan cards */}
      {plans.length > 0 && (
        <div id="plans-section">
          <h2 className="text-lg font-semibold mb-4">{activeSub ? 'Change Plan' : 'Choose a Plan'}</h2>
          <div className={`grid gap-5 ${plans.length === 1 ? '' : plans.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
            {plans.map((plan, i) => {
              const isCurrentPlan = activeSub?.plan === plan.id
              const isPopular = i === (plans.length === 3 ? 1 : Math.floor(plans.length / 2)) && plans.length > 1
              const features = featuresForPlan(plan, i)
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
                    {features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>

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

      {plans.length === 0 && (
        <p className="text-muted-foreground text-sm">No plans are available right now. Contact support.</p>
      )}
    </div>
  )
}
