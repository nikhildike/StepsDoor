/**
 * services/jobService.ts
 *
 * Thin wrapper around the shared `api` Axios instance for the private job
 * listing endpoints (company-posted jobs job seekers browse for free and
 * are redirected off-app to apply). Consumed by `hooks/useJobs.ts` and the
 * Jobs tab's list/detail screens. Saved jobs live in `seekerService.ts`.
 * Mirrors `frontend/src/services/jobService.js`.
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
   * Records an "Apply" click (for the company's analytics) and returns
   * the job's redirect URL to open.
   * @param id - Job's numeric id.
   * @returns Axios response with `{ redirect_url }`.
   * @remarks Called right before opening `redirect_url` from the Job
   *   detail screen or a company's careers page, so the click is logged
   *   even though there's no in-app application flow. Falls back to the
   *   job record's own `redirect_url` if this call fails, so Apply never breaks.
   */
  trackClick: (id: number) => api.post(`/jobs/${id}/track-click/`),
};
