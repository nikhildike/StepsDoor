/**
 * API domain: Tenders (`backend/apps/tenders`) — browsing scraped
 * government tender listings (from mahatenders.gov.in, eprocure.gov.in,
 * etc.), plus the logged-in user's TenderAlert subscriptions. Built on the
 * shared `api` Axios instance (see `./api.js`). Mirrored in
 * `mobile/src/services/` for the Expo app's Tenders tab.
 */
import api from './api'

export const tenderService = {
  /**
   * Lists/searches government tender listings.
   *
   * Endpoint: GET /tenders/
   * @param {Object} [params] - Filter/search/pagination query params.
   * @returns {Promise} Axios response promise resolving to a paginated list of tenders.
   * Used by: `pages/public/Tenders.jsx`.
   */
  list: (params) => api.get('/tenders/', { params }),

  /**
   * Fetches a single tender's detail.
   *
   * Endpoint: GET /tenders/{id}/
   * @param {string|number} id - Tender id.
   * @returns {Promise} Axios response promise resolving to the tender detail.
   * Used by: `pages/public/TenderDetail.jsx`.
   */
  get: (id) => api.get(`/tenders/${id}/`),

  /**
   * Lists Indian states available for filtering tender listings.
   *
   * Endpoint: GET /tenders/states/
   * @returns {Promise} Axios response promise resolving to a list of states.
   * Used by: `pages/public/Tenders.jsx` filter controls.
   */
  states: () => api.get('/tenders/states/'),

  /**
   * Lists the logged-in user's tender alert subscriptions.
   *
   * Endpoint: GET /tenders/alerts/
   * @returns {Promise} Axios response promise resolving to a list of TenderAlert records.
   * Used by: `pages/seeker/Alerts.jsx`.
   */
  alerts: () => api.get('/tenders/alerts/'),

  /**
   * Creates a new tender alert for the logged-in user.
   *
   * Endpoint: POST /tenders/alerts/
   * @param {Object} data - Alert criteria (e.g. keywords, state).
   * @returns {Promise} Axios response promise resolving to the created TenderAlert.
   * Used by: `pages/seeker/Alerts.jsx`.
   */
  createAlert: (data) => api.post('/tenders/alerts/', data),

  /**
   * Deletes a tender alert.
   *
   * Endpoint: DELETE /tenders/alerts/{id}/
   * @param {string|number} id - Alert id.
   * @returns {Promise} Axios response promise resolving when the alert is deleted.
   * Used by: `pages/seeker/Alerts.jsx`.
   */
  deleteAlert: (id) => api.delete(`/tenders/alerts/${id}/`),
}
