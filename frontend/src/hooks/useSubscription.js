/**
 * useSubscription.js — Loads the company's active subscription status
 * and the list of available subscription plans on mount.
 *
 * Both requests are fired in parallel and failures are swallowed
 * silently (e.g. no active subscription yet) so the caller can render
 * a sensible empty/upsell state rather than an error. Results are
 * cached in `subscriptionStore` (Zustand) for reuse across pages.
 *
 * Used by company-side pages: Subscription (manage/upgrade plan),
 * Dashboard (subscription status banner), Pricing (plan comparison).
 */
import { useEffect } from 'react'
import { useSubscriptionStore } from '@/store/subscriptionStore'
import { subscriptionService } from '@/services/subscriptionService'

/**
 * Fetches and exposes the current company's subscription status and the
 * catalog of available plans.
 *
 * @returns {{ subscription: object|null, plans: Array<object> }} The
 *   active subscription (null/undefined if none) and the list of plans.
 * Used by: pages/company/Subscription, pages/company/Dashboard,
 * pages/public/Pricing.
 */
export function useSubscription() {
  const { subscription, plans, setSubscription, setPlans } = useSubscriptionStore()

  useEffect(() => {
    // Fetch status and plans independently; each failure is swallowed so
    // one failing request doesn't block the other from populating state.
    subscriptionService.status().then(({ data }) => setSubscription(data)).catch(() => {})
    subscriptionService.plans().then(({ data }) => setPlans(data)).catch(() => {})
  }, [])

  return { subscription, plans }
}
