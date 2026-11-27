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
   * Partially updates an existing tender alert (e.g. toggling is_active).
   *
   * Endpoint: PATCH /tenders/alerts/{id}/
   * @param {string|number} id - Alert id.
   * @param {Object} data - Fields to update (e.g. `{ is_active: false }`).
   * @returns {Promise} Axios response promise resolving to the updated TenderAlert.
   * Used by: `pages/seeker/Alerts.jsx`.
   */
  updateAlert: (id, data) => api.patch(`/tenders/alerts/${id}/`, data),

  /**
   * Deletes a tender alert.
   *
   * Endpoint: DELETE /tenders/alerts/{id}/
   * @param {string|number} id - Alert id.
   * @returns {Promise} Axios response promise resolving when the alert is deleted.
   * Used by: `pages/seeker/Alerts.jsx`.
   */
  deleteAlert: (id) => api.delete(`/tenders/alerts/${id}/`),

  /**
   * Open tenders matching one tender alert, soonest closing first (same rules as the daily email).
   *
   * Endpoint: GET /tenders/alerts/{id}/matches/
   * @param {number} id - Alert id. @param {Object} [params] - `limit` (default 20, max 50).
   * @returns {Promise} Axios response promise resolving to `{count, results: [tender list fields]}`.
   * Used by: `components/tenders/TenderAlertMatches.jsx`.
   */
  alertMatches: (id, params) => api.get(`/tenders/alerts/${id}/matches/`, { params }),

  /**
   * Open tenders matching any active tender alert, each once. Same shape as `alertMatches`.
   *
   * Endpoint: GET /tenders/alerts/matches/
   * Used by: the contractor dashboard (`pages/seeker/Overview.jsx`).
   */
  allAlertMatches: (params) => api.get('/tenders/alerts/matches/', { params }),

  /**
   * Keyword suggestions for the tender alert form, from open tenders' titles.
   *
   * Endpoint: GET /tenders/alerts/suggestions/?q=
   * @returns {Promise} Axios response promise resolving to `[{keyword, count}]`.
   * Used by: the tender alert form's `KeywordAutocomplete` (pages/seeker/Alerts.jsx).
   */
  keywordSuggestions: (q) => api.get('/tenders/alerts/suggestions/', { params: { q } }),

  /**
   * The signed-in user's saved tenders, newest first.
   *
   * Endpoint: GET /tenders/saved/
   * @returns {Promise} Axios response promise resolving to `[{id, tender, saved_at, is_open, details}]`.
   * Used by: `hooks/useSavedTenders.js`, `pages/seeker/SavedTenders.jsx`.
   */
  saved: () => api.get('/tenders/saved/'),

  /**
   * Save a tender (idempotent: an already-saved tender returns its existing bookmark).
   *
   * Endpoint: POST /tenders/saved/
   * @param {number} tenderId - The tender's id.
   */
  save: (tenderId) => api.post('/tenders/saved/', { tender: tenderId }),

  /**
   * Remove a saved tender.
   *
   * Endpoint: DELETE /tenders/saved/{savedId}/
   * @param {number} savedId - The bookmark's id (not the tender's).
   */
  unsave: (savedId) => api.delete(`/tenders/saved/${savedId}/`),

  /**
   * Numbers for the contractor dashboard's stat cards.
   *
   * Endpoint: GET /tenders/stats/
   * @returns {Promise} Axios response promise resolving to
   *   `{saved_tenders, active_alerts, alert_matches, new_today, open_tenders}`.
   * Used by: `pages/seeker/Overview.jsx` (ContractorDashboard).
   */
  stats: () => api.get('/tenders/stats/'),
}
