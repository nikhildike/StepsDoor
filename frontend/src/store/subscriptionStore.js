/**
 * State slice: Subscription cache — caches the logged-in company's active
 * subscription plan and the list of all available plans, so pages that need
 * this data (e.g. gating company features, showing plan details) don't each
 * have to re-fetch it. Not persisted (plain `create`, no `zustand/persist`)
 * — refetched on app load / relevant page mount via
 * `services/subscriptionService.js`. This is a web-only (company-side)
 * concern; the mobile app is job-seeker only and has no equivalent store.
 */
import { create } from 'zustand'

export const useSubscriptionStore = create((set) => ({
  // The company's currently active subscription (plan, status, renewal
  // date, etc.), or null when not yet loaded / no active subscription.
  // Populated from `subscriptionService.current()`.
  subscription: null,
  // All available subscription plans to choose from. Starts as an empty
  // array until `subscriptionService.plans()` resolves.
  plans: [],
  /**
   * Caches the company's active subscription.
   * Called by: `pages/company/Subscription.jsx` and `pages/company/Dashboard.jsx`
   * after `subscriptionService.current()` resolves.
   */
  setSubscription: (subscription) => set({ subscription }),
  /**
   * Caches the full list of available subscription plans.
   * Called by: `pages/public/Pricing.jsx` and `pages/company/Subscription.jsx`
   * after `subscriptionService.plans()` resolves.
   */
  setPlans: (plans) => set({ plans }),
}))
