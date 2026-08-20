/**
 * API domain: Companies (`backend/apps/companies`) — public company
 * directory/profile listing, the logged-in company's own profile (view,
 * update, logo upload), and a company's public careers page. Built on the
 * shared `api` Axios instance (see `./api.js`).
 */
import api from './api'

export const companyService = {
  /**
   * Lists companies for the public "Companies" directory page.
   *
   * Endpoint: GET /companies/public/
   * @returns {Promise} Axios response promise resolving to a list of public company profiles.
   * Used by: `pages/public/Companies.jsx`.
   */
  list: () => api.get('/companies/public/'),

  /**
   * Fetches the logged-in company user's own profile.
   *
   * Endpoint: GET /companies/me/
   * @returns {Promise} Axios response promise resolving to the current company's profile.
   * Used by: `pages/company/Dashboard.jsx`, `pages/company/Profile.jsx`.
   */
  get: () => api.get('/companies/me/'),

  /**
   * Updates the logged-in company's profile fields.
   *
   * Endpoint: PATCH /companies/me/
   * @param {Object} data - Partial company profile fields to update.
   * @returns {Promise} Axios response promise resolving to the updated company profile.
   * Used by: `pages/company/Profile.jsx`.
   */
  update: (data) => api.patch('/companies/me/', data),

  /**
   * Uploads/replaces the logged-in company's logo. Reuses the `/companies/me/`
   * PATCH endpoint but overrides the content type to multipart form data so
   * the file is sent correctly (overriding the default JSON header set on
   * the shared `api` instance).
   *
   * Endpoint: PATCH /companies/me/ (multipart/form-data)
   * @param {FormData} formData - Must include the logo file field.
   * @returns {Promise} Axios response promise resolving to the updated company profile.
   * Used by: `pages/company/Profile.jsx`.
   */
  uploadLogo: (formData) => api.patch('/companies/me/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),

  /**
   * Fetches a company's public careers page (its live job listings), by slug.
   *
   * Endpoint: GET /companies/{slug}/careers/
   * @param {string} slug - The company's public slug/identifier.
   * @returns {Promise} Axios response promise resolving to the company's careers listing.
   * Used by: a public company careers page (linked from job listings /
   * `pages/public/Companies.jsx`).
   */
  careers: (slug) => api.get(`/companies/${slug}/careers/`),
}
