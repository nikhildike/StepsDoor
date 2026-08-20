/**
 * API domain: Subscriptions (`backend/apps/subscriptions`) — available
 * subscription plans and the logged-in company's currently active plan.
 * Built on the shared `api` Axios instance (see `./api.js`). Results are
 * typically cached into `store/subscriptionStore.js` (`setPlans`/
 * `setSubscription`) for reuse across pages. Related checkout/invoice calls
 * live in `services/paymentService.js`.
 */
import api from './api'

export const subscriptionService = {
  /**
   * Lists all available subscription plans.
   *
   * Endpoint: GET /subscriptions/plans/
   * @returns {Promise} Axios response promise resolving to a list of plans.
   * Used by: `pages/public/Pricing.jsx`, `pages/company/Subscription.jsx`
   *   (feeds `useSubscriptionStore.setPlans`).
   */
  plans: () => api.get('/subscriptions/plans/'),

  /**
   * Fetches the logged-in company's currently active subscription.
   *
   * Endpoint: GET /subscriptions/current/
   * @returns {Promise} Axios response promise resolving to the active subscription
   *   (or null/empty if none).
   * Used by: `pages/company/Subscription.jsx`, `pages/company/Dashboard.jsx`
   *   (feeds `useSubscriptionStore.setSubscription`).
   */
  current: () => api.get('/subscriptions/current/'),
}
