/**
 * API domain: Stores (`backend/apps/stores`) — company storefront/catalogue
 * listings: public browsing (general and "retail"-specific), the logged-in
 * store owner's own profile (view, update, logo upload), and affiliate
 * click-through tracking. Built on the shared `api` Axios instance
 * (see `./api.js`).
 */
import api from './api'

export const storeService = {
  /**
   * Lists/searches public storefronts.
   *
   * Endpoint: GET /stores/
   * @param {Object} [params] - Filter/search/pagination query params.
   * @returns {Promise} Axios response promise resolving to a paginated list of stores.
   * Used by: a public stores listing page.
   */
  list:       (params) => api.get('/stores/', { params }),

  /**
   * Lists/searches storefronts restricted to the "retail" subset.
   *
   * Endpoint: GET /stores/retail/
   * @param {Object} [params] - Filter/search/pagination query params.
   * @returns {Promise} Axios response promise resolving to a paginated list of retail stores.
   * Used by: a retail-focused stores listing page.
   */
  listRetail: (params) => api.get('/stores/retail/', { params }),

  /**
   * Fetches the logged-in user's own store profile.
   *
   * Endpoint: GET /stores/me/
   * @returns {Promise} Axios response promise resolving to the current store profile.
   * Used by: a store profile-editing page.
   */
  getMe:      ()       => api.get('/stores/me/'),

  /**
   * Updates the logged-in user's own store profile.
   *
   * Endpoint: PATCH /stores/me/
   * @param {Object} data - Partial store profile fields to update.
   * @returns {Promise} Axios response promise resolving to the updated store profile.
   * Used by: a store profile-editing page.
   */
  update:     (data)   => api.patch('/stores/me/', data),

  /**
   * Uploads/replaces the logged-in store's logo. Reuses the `/stores/me/`
   * PATCH endpoint but overrides the content type to multipart form data so
   * the file is sent correctly (overriding the default JSON header set on
   * the shared `api` instance).
   *
   * Endpoint: PATCH /stores/me/ (multipart/form-data)
   * @param {FormData} formData - Must include the logo file field.
   * @returns {Promise} Axios response promise resolving to the updated store profile.
   * Used by: a store profile-editing page.
   */
  uploadLogo: (formData) => api.patch('/stores/me/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),

  /**
   * Records a click and returns the best affiliate redirect URL for a
   * subscribed store.
   *
   * Endpoint: POST /stores/{id}/click/
   * @param {string|number} id - Store id.
   * @returns {Promise} Axios response promise resolving to the affiliate redirect URL.
   * Used by: a store detail/listing page (on outbound click).
   */
  click: (id) => api.post(`/stores/${id}/click/`),
}
