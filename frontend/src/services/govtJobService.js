/**
 * API domain: Government Jobs (`backend/apps/govtjobs`) — browsing scraped
 * govt job listings (from NCS API / recruitment portals), plus the logged-in
 * job seeker's GovtJobAlert subscriptions. Built on the shared `api` Axios
 * instance (see `./api.js`). Mirrored in `mobile/src/services/` for the
 * Expo app's Govt Jobs tab.
 */
import api from './api'

export const govtJobService = {
  /**
   * Lists/searches government job listings.
   *
   * Endpoint: GET /govtjobs/
   * @param {Object} [params] - Filter/search/pagination query params.
   * @returns {Promise} Axios response promise resolving to a paginated list of govt jobs.
   * Used by: `pages/public/GovtJobs.jsx`.
   */
  list: (params) => api.get('/govtjobs/', { params }),

  /**
   * Fetches a single government job listing.
   *
   * Endpoint: GET /govtjobs/{id}/
   * @param {string|number} id - Govt job id.
   * @returns {Promise} Axios response promise resolving to the govt job detail.
   * Used by: `pages/public/GovtJobDetail.jsx`.
   */
  get: (id) => api.get(`/govtjobs/${id}/`),

  /**
   * Lists Indian states available for filtering govt job listings.
   *
   * Endpoint: GET /govtjobs/states/
   * @returns {Promise} Axios response promise resolving to a list of states.
   * Used by: `pages/public/GovtJobs.jsx` filter controls.
   */
  states: () => api.get('/govtjobs/states/'),

  /**
   * Lists the logged-in job seeker's govt job alert subscriptions.
   *
   * Endpoint: GET /govtjobs/alerts/
   * @returns {Promise} Axios response promise resolving to a list of GovtJobAlert records.
   * Used by: `pages/seeker/Alerts.jsx`.
   */
  alerts: () => api.get('/govtjobs/alerts/'),

  /**
   * Creates a new govt job alert for the logged-in job seeker.
   *
   * Endpoint: POST /govtjobs/alerts/
   * @param {Object} data - Alert criteria (e.g. keywords, state).
   * @returns {Promise} Axios response promise resolving to the created GovtJobAlert.
   * Used by: `pages/seeker/Alerts.jsx`.
   */
  createAlert: (data) => api.post('/govtjobs/alerts/', data),

  /**
   * Deletes a govt job alert.
   *
   * Endpoint: DELETE /govtjobs/alerts/{id}/
   * @param {string|number} id - Alert id.
   * @returns {Promise} Axios response promise resolving when the alert is deleted.
   * Used by: `pages/seeker/Alerts.jsx`.
   */
  deleteAlert: (id) => api.delete(`/govtjobs/alerts/${id}/`),
}
