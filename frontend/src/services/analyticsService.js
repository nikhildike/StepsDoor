/**
 * API domain: Analytics (`backend/apps/analytics`) — per-job click-tracking
 * data for company dashboards. Built on the shared `api` Axios instance
 * (see `./api.js`). A mirrored copy of this pattern exists for the mobile
 * app's services, though click analytics are a company/web-only feature.
 */
import api from './api'

export const analyticsService = {
  /**
   * Fetches click analytics events/aggregates for the logged-in company.
   *
   * Endpoint: GET /analytics/
   * @param {Object} [params] - Query params (e.g. date range, job filters)
   *   forwarded as-is to the backend.
   * @returns {Promise} Axios response promise resolving to click analytics data.
   * Used by: `pages/company/Analytics.jsx` to power the Recharts-based
   * analytics dashboard.
   */
  clicks: (params) => api.get('/analytics/', { params }),
}
