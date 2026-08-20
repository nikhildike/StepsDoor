/**
 * services/jobService.ts
 *
 * Thin wrapper around the shared `api` Axios instance for the private job
 * listing endpoints (company-posted jobs job seekers browse for free and
 * are redirected off-app to apply) plus the seeker's saved-jobs list.
 * Consumed by `hooks/useJobs.ts` and the Jobs tab's list/detail screens
 * and the seeker's Saved Jobs screen. Mirrors `frontend/src/services/jobService.js`.
 */
import api from './api';

export const jobService = {
  /**
   * List private job postings, optionally filtered/paginated.
   * @param params - Optional query params (e.g. `{ search, city, job_type, page }`,
   *   matching `store/jobStore.ts`'s `Filters` shape).
   * @returns Axios response with a paginated list of jobs (`{ results, count }`).
   * @remarks Used by `hooks/useJobs.ts`, which backs the Jobs list screen.
   */
  list: (params?: object) => api.get('/jobs/', { params }),
  /**
   * Fetch a single job posting by id.
   * @param id - Job's numeric id.
   * @returns Axios response with the job's full detail (including the
   *   external `redirect_url` job seekers are sent to in order to apply).
   * @remarks Used by the Job detail screen.
   */
  get: (id: number) => api.get(`/jobs/${id}/`),
  /**
   * List the signed-in job seeker's saved/bookmarked jobs.
   * @returns Axios response with the user's saved job entries.
   * @remarks Used by the seeker's Saved Jobs screen.
   */
  saved: () => api.get('/jobseekers/saved/'),
  /**
   * Save (bookmark) a job for the signed-in job seeker.
   * @param jobId - Numeric id of the job post to save.
   * @returns Axios response confirming the save.
   * @remarks Used by the Job list/detail screens' save/bookmark action.
   */
  save: (jobId: number) => api.post('/jobseekers/saved/', { job_post: jobId }),
  /**
   * Remove a previously saved job for the signed-in job seeker.
   * @param jobId - Numeric id of the job post to unsave.
   * @returns Axios response confirming the removal.
   * @remarks Used by the seeker's Saved Jobs screen.
   */
  unsave: (jobId: number) => api.delete(`/jobseekers/saved/${jobId}/`),
};
