import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle, Zap, Link2, MapPin, Plus, ShoppingBag, Briefcase } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

const CAREER_PAGE_PLANS = [
  {
    id:       '1m',
    label:    '1 Month',
    months:   1,
    price:    299,
    perMonth: 299,
    highlight: false,
  },
  {
    id:       '3m',
    label:    '3 Months',
    months:   3,
    price:    799,
    perMonth: Math.round(799 / 3),
    highlight: false,
    saving:   '₹98 saved',
  },
  {
    id:       '6m',
    label:    '6 Months',
    months:   6,
    price:    1499,
    perMonth: Math.round(1499 / 6),
    highlight: true,
    saving:   '₹295 saved',
  },
  {
    id:       '12m',
    label:    '12 Months',
    months:   12,
    price:    2999,
    perMonth: Math.round(2999 / 12),
    highlight: false,
    saving:   '₹589 saved',
  },
]

const EMPLOYER_FEATURES = [
  'Branded /careers/your-company page',
  '3 job links included (always free)',
  'Click analytics per job link',
  'Redirect to your ATS / careers site',
  'Visible in the Linksdoor company directory',
]

const STORE_FEATURES = [
  'Listed on the /shopping page with a verified badge',
  'Branded /careers/your-store page for hiring',
  '3 job links included (always free)',
  'Store logo, tagline & direct website link',
  'Category-filtered discovery by shoppers',
]

const RETAIL_STORE_FEATURES = [
  'Listed on the /retail-stores page with a verified badge',
  '"Find Store" button linking to your branch locator',
  'Branded /careers/your-chain page for hiring',
  '3 job links included (always free)',
  'Category-filtered discovery by local shoppers',
]

function formatINR(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(amount)
}

export default function Pricing() {
  const { token, user } = useAuthStore()
  const navigate = useNavigate()
  const [selectedPlan, setSelectedPlan] = useState('6m')

  const isStoreOwner = !!(token && user?.is_store_owner)
  const isCompany    = !!(token && user?.is_company && !user?.is_store_owner)
  const isSeeker     = !!(token && user && !user.is_company && !user.is_store_owner)

  const handleSelect = (role = 'company') => {
    if (isStoreOwner) {
      navigate('/store/subscription')
    } else if (isCompany) {
      navigate('/dashboard/subscription')
    } else {
      navigate('/register', { state: { role } })
    }
  }

  const ctaLabel = (isCompany || isStoreOwner) ? 'Go to Subscription' : 'Get Started'

  return (
    <div className="bg-gray-50 min-h-screen">

      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium px-4 py-1.5 rounded-full mb-4">
            <Zap className="h-4 w-4" /> Simple, transparent pricing
          </div>
          <h1 className="text-4xl font-bold">Hire smarter on Linksdoor</h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
            Get a branded career page, post job links, and reach thousands of active job seekers across India — starting at just ₹299/month.
          </p>
          {isSeeker && (
            <p className="mt-4 text-sm text-muted-foreground">
              These plans are for employers and store owners.{' '}
              <Link to="/register" className="text-primary hover:underline">Create an account</Link> to get started.
            </p>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">

        {/* ── Career Page Plans ── */}
        <div>
          {/* Who is this for */}
          <div className="grid sm:grid-cols-3 gap-4 mb-10">
            <div className="bg-white border border-border rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Briefcase className="h-4 w-4 text-primary" />
                </div>
                <p className="font-semibold">Employers</p>
              </div>
              <ul className="space-y-2">
                {EMPLOYER_FEATURES.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />{f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white border border-border rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-lg bg-orange-50 flex items-center justify-center">
                  <ShoppingBag className="h-4 w-4 text-orange-600" />
                </div>
                <p className="font-semibold">Online Stores</p>
              </div>
              <ul className="space-y-2">
                {STORE_FEATURES.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />{f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white border border-border rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-lg bg-green-50 flex items-center justify-center">
                  <MapPin className="h-4 w-4 text-green-600" />
                </div>
                <p className="font-semibold">Retail Chains</p>
              </div>
              <ul className="space-y-2">
                {RETAIL_STORE_FEATURES.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />{f}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 text-sm font-medium text-primary mb-2">
              <Link2 className="h-4 w-4" /> One plan covers both roles
            </div>
            <h2 className="text-2xl font-bold">Choose your billing period.</h2>
            <p className="text-muted-foreground mt-2 text-sm max-w-md mx-auto">
              Same price whether you're an employer or a store owner. Pay less when you commit longer.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {CAREER_PAGE_PLANS.map(plan => {
              const isSelected = selectedPlan === plan.id
              return (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`relative bg-white rounded-2xl border-2 p-6 flex flex-col cursor-pointer transition-all ${
                    plan.highlight
                      ? isSelected ? 'border-primary shadow-lg' : 'border-primary/40 shadow-sm'
                      : isSelected ? 'border-primary shadow-md' : 'border-border hover:border-primary/30'
                  }`}
                >
                  {plan.highlight && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap">
                      Best Value
                    </span>
                  )}

                  <div className="mb-4">
                    <p className="text-sm font-medium text-muted-foreground">{plan.label}</p>
                    <p className="mt-1">
                      <span className="text-3xl font-bold">{formatINR(plan.price)}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatINR(plan.perMonth)}/month
                    </p>
                    {plan.saving && (
                      <span className="inline-block mt-1.5 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                        {plan.saving}
                      </span>
                    )}
                  </div>

                  <div className={`mt-auto pt-3 border-t ${isSelected ? 'border-primary/20' : 'border-border'}`}>
                    <div className={`flex items-center justify-center gap-1.5 text-xs font-semibold ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                      {isSelected && <CheckCircle className="h-3.5 w-3.5" />}
                      {isSelected ? 'Selected' : 'Select'}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* CTA */}
          <div className="mt-8 bg-white border border-border rounded-2xl p-8 flex flex-col md:flex-row gap-8 items-center">
            {(() => {
              const plan = CAREER_PAGE_PLANS.find(p => p.id === selectedPlan)
              return (
                <>
                  <div className="flex-1 text-center md:text-left">
                    <p className="font-semibold">Selected: {plan.label} plan</p>
                    <p className="text-3xl font-bold mt-1">{formatINR(plan.price)}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{formatINR(plan.perMonth)}/month · No setup fee · Cancel anytime</p>
                  </div>
                  <div className="flex flex-col gap-2 w-full md:w-56">
                    {(!token || isCompany) && (
                      <button
                        onClick={() => handleSelect('company')}
                        className="w-full py-3 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                      >
                        <Briefcase className="h-4 w-4" />
                        {isCompany ? 'Go to Subscription' : 'Start as Employer'}
                      </button>
                    )}
                    {(!token || isStoreOwner) && (
                      <button
                        onClick={() => handleSelect('store')}
                        className="w-full py-3 rounded-xl text-sm font-semibold bg-orange-500 text-white hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
                      >
                        <ShoppingBag className="h-4 w-4" />
                        {isStoreOwner ? 'Go to Subscription' : 'Start as Online Store'}
                      </button>
                    )}
                    {!token && (
                      <button
                        onClick={() => navigate('/register', { state: { role: 'retail' } })}
                        className="w-full py-3 rounded-xl text-sm font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <MapPin className="h-4 w-4" />
                        Start as Retail Store
                      </button>
                    )}
                  </div>
                </>
              )
            })()}
          </div>
        </div>

        {/* ── Job Link Add-on pricing ── */}
        <div>
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 text-sm font-medium text-primary mb-2">
              <Plus className="h-4 w-4" /> Job Link Add-ons
            </div>
            <h2 className="text-2xl font-bold">Pay only for what you post</h2>
            <p className="text-muted-foreground mt-2 text-sm max-w-md mx-auto">
              Your first 3 job links are always free with any active career page subscription. Add more as you grow.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* Free tier */}
            <div className="bg-white border border-border rounded-2xl p-8 flex flex-col">
              <div className="h-10 w-10 rounded-xl bg-green-50 flex items-center justify-center mb-4">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold">First 3 Job Links</h3>
              <p className="text-4xl font-bold mt-3">Free</p>
              <p className="text-sm text-muted-foreground mt-0.5">included with your subscription</p>
              <ul className="mt-6 space-y-2.5 flex-1">
                {[
                  'Post up to 3 active job links',
                  'Click analytics per link',
                  'Redirect to your ATS / site',
                  'Appear on your career page',
                ].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Paid add-on */}
            <div className="bg-white border-2 border-primary rounded-2xl p-8 flex flex-col relative">
              <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap">
                Add-on
              </span>
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Plus className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Extra Job Links</h3>
              <p className="mt-3">
                <span className="text-4xl font-bold">₹49</span>
                <span className="text-muted-foreground text-sm ml-1">/ link / month</span>
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">from the 4th job link onwards</p>
              <ul className="mt-6 space-y-2.5 flex-1">
                {[
                  'Add as many links as you need',
                  'Charged per active job link',
                  'Same analytics & redirect features',
                  'Deactivate anytime to stop billing',
                ].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Example calculation */}
          <div className="mt-6 bg-blue-50 border border-blue-100 rounded-xl p-5 max-w-2xl mx-auto">
            <p className="text-sm font-semibold text-blue-800 mb-3">Example — Monthly cost estimate</p>
            <div className="space-y-2 text-sm text-blue-700">
              <div className="flex justify-between">
                <span>Career page (1 month plan)</span>
                <span className="font-medium">₹299</span>
              </div>
              <div className="flex justify-between">
                <span>First 3 job links</span>
                <span className="font-medium text-green-700">Free</span>
              </div>
              <div className="flex justify-between">
                <span>2 extra job links (5th & 6th) × ₹49</span>
                <span className="font-medium">₹98</span>
              </div>
              <div className="flex justify-between border-t border-blue-200 pt-2 font-semibold">
                <span>Total for 6 active job links</span>
                <span>₹397/month</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Comparison table ── */}
        <div>
          <h2 className="text-center text-xl font-semibold mb-8">Plan comparison</h2>
          <div className="bg-white border border-border rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-6 py-4 font-semibold">Duration</th>
                  <th className="text-right px-4 py-4 font-semibold">Total price</th>
                  <th className="text-right px-4 py-4 font-semibold">Per month</th>
                  <th className="text-right px-6 py-4 font-semibold text-green-700">You save</th>
                </tr>
              </thead>
              <tbody>
                {CAREER_PAGE_PLANS.map((plan, i) => (
                  <tr key={plan.id} className={`border-b last:border-0 ${plan.highlight ? 'bg-primary/5' : ''}`}>
                    <td className="px-6 py-4 font-medium flex items-center gap-2">
                      {plan.label}
                      {plan.highlight && (
                        <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">Best Value</span>
                      )}
                    </td>
                    <td className="text-right px-4 py-4 font-semibold">{formatINR(plan.price)}</td>
                    <td className="text-right px-4 py-4 text-muted-foreground">{formatINR(plan.perMonth)}/mo</td>
                    <td className="text-right px-6 py-4 text-green-700 font-medium">
                      {i === 0 ? '—' : plan.saving}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-center text-muted-foreground mt-3">
            Savings calculated vs. equivalent number of 1-month plans · Job link add-ons billed separately
          </p>
        </div>

        {/* ── FAQ ── */}
        <div className="border-t pt-12 max-w-2xl mx-auto space-y-6">
          <h2 className="text-center text-xl font-semibold mb-6">Frequently asked questions</h2>
          {[
            {
              q: 'What is included in the career page subscription?',
              a: 'Your branded Linksdoor career page (/careers/your-company), up to 3 active job links, click analytics, and redirection to your own ATS or careers website.',
            },
            {
              q: 'How are extra job links billed?',
              a: 'The first 3 job links are always free. From the 4th link onwards, each active job link costs ₹49 per month. Deactivate a job post any time to stop being charged for it.',
            },
            {
              q: 'Can I switch billing periods later?',
              a: 'Yes. You can upgrade your subscription period from your dashboard at any time.',
            },
            {
              q: 'How do candidates apply?',
              a: "Candidates click Apply on Linksdoor and are redirected to your own careers page or ATS. We don't store applications — you own the process.",
            },
            {
              q: 'Is there a setup fee or contract?',
              a: 'No setup fee and no long-term contract. Your subscription simply expires at the end of the period you chose.',
            },
            {
              q: 'What does a Store Owner subscription include?',
              a: 'Your store listing appears on the Linksdoor Shopping page with a verified badge, direct link, and category filter. You also get a branded career page (/careers/your-store) and 3 free job links — same as an employer subscription.',
            },
            {
              q: 'Can I be both an employer and a store owner?',
              a: 'Yes. Registering as a Store Owner automatically gives you both a store listing and a company career page under one account. You can post jobs and list your store with a single subscription.',
            },
          ].map(({ q, a }) => (
            <div key={q}>
              <p className="font-medium">{q}</p>
              <p className="text-sm text-muted-foreground mt-1">{a}</p>
            </div>
          ))}
        </div>

        {/* ── Bottom CTA ── */}
        {!token && (
          <div className="bg-primary rounded-2xl p-10 text-center text-primary-foreground">
            <h2 className="text-2xl font-bold">One subscription. Three superpowers.</h2>
            <p className="mt-2 text-primary-foreground/80 max-w-lg mx-auto">
              Whether you're hiring, selling online, or running a retail chain — get a branded presence, job posting, and store listing all from one account.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-primary rounded-lg text-sm font-semibold hover:bg-white/90 transition-colors"
              >
                <Briefcase className="h-4 w-4" /> Register as Employer
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition-colors"
              >
                <ShoppingBag className="h-4 w-4" /> Online Store Owner
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
              >
                <MapPin className="h-4 w-4" /> Retail Store Owner
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
