/**
 * Pricing.jsx
 *
 * Public pricing page mounted at `/pricing` (see App.jsx). Paid plans are
 * not launched yet, so this page only announces that pricing is "coming
 * soon" and that StepsDoor is free to use until then. The previous full
 * plans/add-on/comparison/FAQ page lives in git history — restore it from
 * there when pricing goes live.
 */
import { Link } from 'react-router-dom'
import { Clock, CheckCircle, Briefcase, ShoppingBag, MapPin } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

// What employers and store owners can already do for free while pricing is pending
const FREE_FEATURES = [
  'Branded career page for your company or store',
  'Post job links that redirect to your own careers site',
  'Click analytics per job link',
  'Store listing on the Shopping / Retail Stores pages',
]

/**
 * Renders the "Pricing — coming soon" placeholder: a short free-for-now
 * notice, the list of features available at no cost, and (for anonymous
 * visitors) register buttons for each account role.
 */
export default function Pricing() {
  const { token } = useAuthStore()

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium px-4 py-1.5 rounded-full mb-4">
          <Clock className="h-4 w-4" /> Coming soon
        </div>
        <h1 className="text-4xl font-bold">Pricing is coming soon</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          We're finalising our plans. Until then, StepsDoor is <span className="font-semibold text-foreground">completely free</span> for employers and store owners.
        </p>

        <div className="mt-10 bg-white border border-border rounded-2xl p-6 text-left">
          <p className="font-semibold mb-4">Free for now</p>
          <ul className="space-y-2.5">
            {FREE_FEATURES.map(f => (
              <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />{f}
              </li>
            ))}
          </ul>
        </div>

        {/* Signed-in users already have an account, so only anonymous visitors see the register CTAs */}
        {!token && (
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/register"
              state={{ role: 'company' }}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              <Briefcase className="h-4 w-4" /> Register as Employer
            </Link>
            <Link
              to="/register"
              state={{ role: 'store' }}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition-colors"
            >
              <ShoppingBag className="h-4 w-4" /> Online Store Owner
            </Link>
            <Link
              to="/register"
              state={{ role: 'retail' }}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
            >
              <MapPin className="h-4 w-4" /> Retail Store Owner
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
