/**
 * API domain: Payments (`backend/apps/payments`) — Razorpay subscription
 * checkout kickoff and invoice listing/download (PDF invoices generated
 * server-side with WeasyPrint). Built on the shared `api` Axios instance
 * (see `./api.js`). Related plan/current-subscription data lives in
 * `services/subscriptionService.js` and `store/subscriptionStore.js`.
 */
import api from './api'

export const paymentService = {
  /**
   * Initiates a Razorpay subscription for the given plan for the logged-in
   * company.
   *
   * Endpoint: POST /payments/subscribe/
   * @param {string|number} planId - The subscription plan id to subscribe to.
   * @returns {Promise} Axios response promise resolving to Razorpay order/subscription
   *   details needed to open the Razorpay checkout widget.
   * Used by: `pages/company/Subscription.jsx`.
   */
  createSubscription: (planId) => api.post('/payments/subscribe/', { plan_id: planId }),

  /**
   * Lists past invoices for the logged-in company.
   *
   * Endpoint: GET /payments/invoices/
   * @returns {Promise} Axios response promise resolving to a list of invoices.
   * Used by: `pages/company/Invoices.jsx`.
   */
  invoices: () => api.get('/payments/invoices/'),

  /**
   * Downloads a single invoice as a PDF blob.
   *
   * Endpoint: GET /payments/invoices/{id}/download/
   * @param {string|number} id - Invoice id.
   * @returns {Promise} Axios response promise resolving to a response with
   *   `responseType: 'blob'` (the raw PDF bytes) suitable for triggering a
   *   browser file download.
   * Used by: `pages/company/Invoices.jsx`.
   */
  downloadInvoice: (id) => api.get(`/payments/invoices/${id}/download/`, { responseType: 'blob' }),
}
