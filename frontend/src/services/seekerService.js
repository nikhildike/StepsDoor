/**
 * API domain: Job Seekers (`backend/apps/jobseekers`) — the logged-in job
 * seeker's own profile, saved (bookmarked) private jobs, and their private
 * job alert subscriptions (`backend/apps/alerts`, matched against new
 * postings by a Celery task and dispatched via email/push). Built on the
 * shared `api` Axios instance (see `./api.js`). Mirrored in
 * `mobile/src/services/seekerService.ts` for the Expo app.
 */
import api from './api'

export const seekerService = {
  /**
   * Fetches the logged-in job seeker's profile.
   *
   * Endpoint: GET /jobseekers/profiles/me/
   * @returns {Promise} Axios response promise resolving to the job seeker profile.
   * Used by: `pages/seeker/Profile.jsx`.
   */
  profile: () => api.get('/jobseekers/profiles/me/'),

  /**
   * Updates the logged-in job seeker's profile.
   *
   * Endpoint: PATCH /jobseekers/profiles/me/
   * @param {Object} data - Partial profile fields to update.
   * @returns {Promise} Axios response promise resolving to the updated profile.
   * Used by: `pages/seeker/Profile.jsx`.
   */
  updateProfile: (data) => api.patch('/jobseekers/profiles/me/', data),

  /**
   * Lists jobs the logged-in job seeker has saved/bookmarked.
   *
   * Endpoint: GET /jobseekers/saved-jobs/
   * @returns {Promise} Axios response promise resolving to a list of saved-job records.
   * Used by: `pages/seeker/SavedJobs.jsx`.
   */
  savedJobs: () => api.get('/jobseekers/saved-jobs/'),

  /**
   * Saves/bookmarks a private job listing for the logged-in job seeker.
   *
   * Endpoint: POST /jobseekers/saved-jobs/
   * @param {string|number} jobPostId - The `jobs` app JobPost id to save.
   * @returns {Promise} Axios response promise resolving to the created saved-job record.
   * Used by: `pages/public/JobDetail.jsx` / `pages/public/Jobs.jsx` (save button).
   */
  saveJob: (jobPostId) => api.post('/jobseekers/saved-jobs/', { job_post: jobPostId }),

  /**
   * Removes a previously saved job.
   *
   * Endpoint: DELETE /jobseekers/saved-jobs/{savedJobId}/
   * @param {string|number} savedJobId - The saved-job record id (not the job id itself).
   * @returns {Promise} Axios response promise resolving when the saved job is removed.
   * Used by: `pages/seeker/SavedJobs.jsx`.
   */
  unsaveJob: (savedJobId) => api.delete(`/jobseekers/saved-jobs/${savedJobId}/`),

  /**
   * Lists the logged-in job seeker's private job alert subscriptions.
   *
   * Endpoint: GET /alerts/
   * @returns {Promise} Axios response promise resolving to a list of job alerts.
   * Used by: `pages/seeker/Alerts.jsx`.
   */
  alerts: () => api.get('/alerts/'),

  /**
   * Creates a new private job alert for the logged-in job seeker.
   *
   * Endpoint: POST /alerts/
   * @param {Object} data - Alert criteria (e.g. keywords, city, job type).
   * @returns {Promise} Axios response promise resolving to the created alert.
   * Used by: `pages/seeker/Alerts.jsx`.
   */
  createAlert: (data) => api.post('/alerts/', data),

  /**
   * Updates an existing private job alert.
   *
   * Endpoint: PATCH /alerts/{id}/
   * @param {string|number} id - Alert id.
   * @param {Object} data - Partial alert fields to update.
   * @returns {Promise} Axios response promise resolving to the updated alert.
   * Used by: `pages/seeker/Alerts.jsx`.
   */
  updateAlert: (id, data) => api.patch(`/alerts/${id}/`, data),

  /**
   * Deletes a private job alert.
   *
   * Endpoint: DELETE /alerts/{id}/
   * @param {string|number} id - Alert id.
   * @returns {Promise} Axios response promise resolving when the alert is deleted.
   * Used by: `pages/seeker/Alerts.jsx`.
   */
  deleteAlert: (id) => api.delete(`/alerts/${id}/`),
}
