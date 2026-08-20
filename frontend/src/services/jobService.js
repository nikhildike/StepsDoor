/**
 * API domain: Jobs (`backend/apps/jobs`) — private, company-paid job
 * listings: public browsing/search, single-job detail, a company's own
 * posted jobs (CRUD), and outbound click tracking (job seekers are
 * redirected to the company's own careers page to apply). Built on the
 * shared `api` Axios instance (see `./api.js`). Filter state for the public
 * listing page lives in `store/jobStore.js`. Mirrored in
 * `mobile/src/services/jobService.ts` for the Expo app's Jobs tab.
 */
import api from './api'

export const jobService = {
  /**
   * Lists/searches public job listings.
   *
   * Endpoint: GET /jobs/
   * @param {Object} [params] - Filter/search/pagination query params, typically
   *   sourced from `useJobStore`'s `filters` state (city, job_type, search, page).
   * @returns {Promise} Axios response promise resolving to a paginated list of jobs.
   * Used by: `pages/public/Jobs.jsx`.
   */
  list: (params) => api.get('/jobs/', { params }),

  /**
   * Fetches a single job listing's detail.
   *
   * Endpoint: GET /jobs/{id}/
   * @param {string|number} id - Job id.
   * @returns {Promise} Axios response promise resolving to the job detail.
   * Used by: `pages/public/JobDetail.jsx`.
   */
  get: (id) => api.get(`/jobs/${id}/`),

  /**
   * Lists jobs posted by the logged-in company.
   *
   * Endpoint: GET /jobs/my/
   * @returns {Promise} Axios response promise resolving to the company's own job postings.
   * Used by: `pages/company/ManageJobs.jsx`, `pages/company/Dashboard.jsx`.
   */
  myJobs: () => api.get('/jobs/my/'),

  /**
   * Creates a new job posting for the logged-in company.
   *
   * Endpoint: POST /jobs/
   * @param {Object} data - Job posting fields (title, description via TipTap, etc.).
   * @returns {Promise} Axios response promise resolving to the created job.
   * Used by: `pages/company/PostJob.jsx`.
   */
  create: (data) => api.post('/jobs/', data),

  /**
   * Updates an existing job posting owned by the logged-in company.
   *
   * Endpoint: PATCH /jobs/{id}/
   * @param {string|number} id - Job id.
   * @param {Object} data - Partial job fields to update.
   * @returns {Promise} Axios response promise resolving to the updated job.
   * Used by: `pages/company/PostJob.jsx` (edit mode), `pages/company/ManageJobs.jsx`.
   */
  update: (id, data) => api.patch(`/jobs/${id}/`, data),

  /**
   * Deletes a job posting owned by the logged-in company.
   *
   * Endpoint: DELETE /jobs/{id}/
   * @param {string|number} id - Job id.
   * @returns {Promise} Axios response promise resolving when the job is deleted.
   * Used by: `pages/company/ManageJobs.jsx`.
   */
  delete: (id) => api.delete(`/jobs/${id}/`),

  /**
   * Records a click-through event when a job seeker is redirected to the
   * company's external careers page to apply. Feeds the analytics domain
   * (`analyticsService.clicks`) that powers the company analytics dashboard.
   *
   * Endpoint: POST /jobs/{id}/track-click/
   * @param {string|number} id - Job id.
   * @returns {Promise} Axios response promise.
   * Used by: `pages/public/JobDetail.jsx` (on "Apply" click).
   */
  trackClick: (id) => api.post(`/jobs/${id}/track-click/`),
}
