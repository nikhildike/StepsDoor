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
   * Saves a job of any kind for the logged-in job seeker. Saving a job that's
   * already saved returns the existing record (200) instead of failing.
   *
   * Endpoint: POST /jobseekers/saved-jobs/
   * @param {string|number} id - The job's id.
   * @param {'job'|'company'|'govt'} [kind='job'] - StepsDoor post, company careers job, or govt job.
   * @returns {Promise} Axios response promise resolving to the saved-job record.
   * Used by: `hooks/useSavedJobs.js`.
   */
  saveJob: (id, kind = 'job') => api.post('/jobseekers/saved-jobs/', {
    [{ job: 'job_post', company: 'career_job', govt: 'govt_job' }[kind]]: id,
  }),

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

  /**
   * Open jobs matching one job alert, across StepsDoor posts, company careers
   * pages and govt jobs, newest first.
   *
   * Endpoint: GET /alerts/{id}/matches/
   * @param {string|number} id - Alert id.
   * @param {Object} [params] - `limit` (default 20, max 50).
   * @returns {Promise} Axios response promise resolving to
   *   `{count, counts: {job, company, govt}, results: [{kind, id, title, company, location, apply_url, posted_at, deadline}]}`.
   * Used by: `components/alerts/AlertMatches.jsx` on the Alerts page.
   */
  alertMatches: (id, params) => api.get(`/alerts/${id}/matches/`, { params }),

  /**
   * Open jobs matching any of the seeker's active alerts, each listed once.
   *
   * Endpoint: GET /alerts/matches/
   * @param {Object} [params] - `limit` (default 20, max 50).
   * @returns {Promise} Same shape as `alertMatches`.
   * Used by: `pages/seeker/Overview.jsx` ("Jobs matching your alerts").
   */
  allAlertMatches: (params) => api.get('/alerts/matches/', { params }),

  /**
   * Role keyword suggestions for the job alert form, from open job titles.
   *
   * Endpoint: GET /alerts/suggestions/?q=
   * @param {string} q - What's been typed (2+ characters, else the API returns []).
   * @returns {Promise} Axios response promise resolving to `[{keyword, count}]`, most common first.
   * Used by: `components/alerts/KeywordAutocomplete.jsx`.
   */
  keywordSuggestions: (q) => api.get('/alerts/suggestions/', { params: { q } }),

  /**
   * Numbers for the dashboard's stat cards.
   *
   * Endpoint: GET /jobseekers/stats/
   * @returns {Promise} Axios response promise resolving to
   *   `{saved_jobs, active_alerts, alert_matches, new_jobs_today: {total, job, company, govt}}`.
   * Used by: `pages/seeker/Overview.jsx`.
   */
  stats: () => api.get('/jobseekers/stats/'),
}
