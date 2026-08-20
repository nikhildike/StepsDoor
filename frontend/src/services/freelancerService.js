/**
 * API domain: Freelancers (`backend/apps/freelancers`) — early-stage
 * freelancer profile directory: browsing/searching freelancers, viewing a
 * single profile, managing the logged-in user's own freelancer profile,
 * leaving reviews, and listing available states for filtering. Built on the
 * shared `api` Axios instance (see `./api.js`).
 */
import api from './api'

export const freelancerService = {
  /**
   * Lists/searches freelancer profiles.
   *
   * Endpoint: GET /freelancers/
   * @param {Object} [params] - Filter/search/pagination query params.
   * @returns {Promise} Axios response promise resolving to a paginated list of freelancers.
   * Used by: a freelancers directory/listing page.
   */
  list:      (params) => api.get('/freelancers/', { params }),

  /**
   * Fetches a single freelancer's public profile.
   *
   * Endpoint: GET /freelancers/{id}/
   * @param {string|number} id - Freelancer id.
   * @returns {Promise} Axios response promise resolving to the freelancer profile.
   * Used by: a freelancer detail page.
   */
  get:       (id)     => api.get(`/freelancers/${id}/`),

  /**
   * Fetches the logged-in user's own freelancer profile.
   *
   * Endpoint: GET /freelancers/me/
   * @returns {Promise} Axios response promise resolving to the current user's freelancer profile.
   * Used by: a freelancer profile-editing page.
   */
  me:        ()       => api.get('/freelancers/me/'),

  /**
   * Updates the logged-in user's own freelancer profile.
   *
   * Endpoint: PATCH /freelancers/me/
   * @param {Object} data - Partial freelancer profile fields to update.
   * @returns {Promise} Axios response promise resolving to the updated freelancer profile.
   * Used by: a freelancer profile-editing page.
   */
  updateMe:  (data)   => api.patch('/freelancers/me/', data),

  /**
   * Submits a review for a freelancer.
   *
   * Endpoint: POST /freelancers/{id}/review/
   * @param {string|number} id - Freelancer id being reviewed.
   * @param {Object} data - Review payload (e.g. rating, comment).
   * @returns {Promise} Axios response promise resolving to the created review.
   * Used by: a freelancer detail page's review form.
   */
  review:    (id, data) => api.post(`/freelancers/${id}/review/`, data),

  /**
   * Lists Indian states available for filtering freelancer listings.
   *
   * Endpoint: GET /freelancers/states/
   * @returns {Promise} Axios response promise resolving to a list of states.
   * Used by: freelancer listing filter controls.
   */
  states:    ()       => api.get('/freelancers/states/'),
}
