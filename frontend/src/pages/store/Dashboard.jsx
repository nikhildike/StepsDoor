/**
 * Store Dashboard page.
 *
 * Route: `/store` or `/store/dashboard` (index route under the store owner account layout).
 * Access: store owner accounts only — companion to the backend `stores` app
 * (storefront/catalogue listings, separate from company job postings).
 *
 * Summarizes whether the store is currently visible on the public Shopping
 * page (i.e. has an active subscription), and shows read-only summaries of
 * the store's info and subscription status with links to edit each.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Store, CreditCard, ExternalLink, AlertCircle, CheckCircle } from 'lucide-react'
import { storeService } from '@/services/storeService'
import { subscriptionService } from '@/services/subscriptionService'

/**
 * Renders the store owner's dashboard: live/not-live status banner, a store
 * info summary card, and a subscription status summary card.
 */
export default function StoreDashboard() {
  // The logged-in user's store profile (name, category, website, subscription flag).
  const [store, setStore] = useState(null)
  // Current subscription record (status, expiry), independent of storeService.
  const [sub, setSub] = useState(null)
  // True while the initial combined fetch is in flight.
  const [loading, setLoading] = useState(true)

  // Fetches the store profile and subscription status in parallel on mount.
  // Each call is individually caught so one failing (e.g. no store set up yet,
  // or no subscription yet) doesn't prevent the other from rendering.
  // GET /stores/me/ (stores app) and GET /subscriptions/current/ (subscriptions app).
  useEffect(() => {
    Promise.all([
      storeService.getMe().then(r => setStore(r.data)).catch(() => {}),
      subscriptionService.current().then(r => setSub(r.data)).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  // Loading state: show a placeholder until both store and subscription data have settled.
  if (loading) return <div className="text-sm text-muted-foreground">Loading...</div>

  // Whether the store currently appears on the public Shopping page.
  const isLive = store?.has_active_subscription

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Store Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your store listing on StepsDoor Shopping</p>
      </div>

      {/* Status banner: green "live" state vs amber prompt to subscribe, based on isLive. */}
      {isLive ? (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
          <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">Your store is live</p>
            <p className="text-xs text-green-700 mt-0.5">
              Visible on the{' '}
              <Link to="/shopping" className="underline">Shopping page</Link>
              {' '}— subscribers can discover and visit your store.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Store not yet visible</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Activate a subscription to make your store appear on the Shopping page.
            </p>
          </div>
          <Link
            to="/store/subscription"
            className="ml-auto shrink-0 px-3 py-1.5 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 transition-colors"
          >
            Subscribe
          </Link>
        </div>
      )}

      {/* Store card */}
      <div className="bg-white border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2"><Store className="h-4 w-4" /> Store Info</h2>
          <Link to="/store/profile" className="text-xs text-primary hover:underline">Edit</Link>
        </div>
        {/* Only render store details once the store profile has loaded; otherwise prompt setup. */}
        {store ? (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{store.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Category</span>
              <span className="font-medium capitalize">{store.category}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Website</span>
              <a
                href={store.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary flex items-center gap-1 hover:underline"
              >
                Visit <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No store info yet. <Link to="/store/profile" className="text-primary hover:underline">Set it up</Link>.</p>
        )}
      </div>

      {/* Subscription card */}
      <div className="bg-white border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2"><CreditCard className="h-4 w-4" /> Subscription</h2>
          <Link to="/store/subscription" className="text-xs text-primary hover:underline">Manage</Link>
        </div>
        {/* Only render subscription details once a subscription record has loaded. */}
        {sub ? (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              {/* Green when active, amber for any other status (e.g. expired/pending). */}
              <span className={`font-semibold ${sub.status === 'active' ? 'text-green-600' : 'text-amber-600'}`}>
                {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expires</span>
              <span className="font-medium">{new Date(sub.end_date).toLocaleDateString('en-IN')}</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No active subscription.</p>
        )}
      </div>
    </div>
  )
}
