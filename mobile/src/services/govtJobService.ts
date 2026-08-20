/**
 * services/govtJobService.ts
 *
 * Thin wrapper around the shared `api` Axios instance for the government
 * jobs endpoints (browsing govt job listings, sourced from NCS API /
 * recruitment portals, plus the job seeker's GovtJobAlert subscriptions).
 * Browsing is free/public; consumed by the Govt Jobs tab's list/detail
 * screens (`screens/govtjobs/`) and the seeker's Alerts screen. Mirrors
 * `frontend/src/services/govtJobService.js`.
 */
import api from './api';

export const govtJobService = {
  /**
   * List government job postings, optionally filtered/paginated.
   * @param params - Optional query params (e.g. search, page, filters).
   * @returns Axios response with a paginated list of govt jobs.
   * @remarks Used by the Govt Jobs list screen.
   */
  list: (params?: object) => api.get('/govtjobs/', { params }),
  /**
   * Fetch a single government job posting by id.
   * @param id - Govt job's numeric id.
   * @returns Axios response with the govt job's full detail.
   * @remarks Used by the Govt Job detail screen.
   */
  get: (id: number) => api.get(`/govtjobs/${id}/`),
  /**
   * List the signed-in job seeker's saved govt-job alert subscriptions.
   * @returns Axios response with the user's GovtJobAlert records.
   * @remarks Used by the seeker's Alerts screen.
   */
  alerts: () => api.get('/govtjobs/alerts/'),
  /**
   * Create a new govt-job alert (matches new postings against criteria;
   * dispatched via Celery on the backend).
   * @param data - Alert criteria payload (e.g. keywords, location).
   * @returns Axios response with the created alert.
   * @remarks Used by the seeker's Alerts screen.
   */
  createAlert: (data: object) => api.post('/govtjobs/alerts/', data),
  /**
   * Delete an existing govt-job alert.
   * @param id - Alert's numeric id.
   * @returns Axios response confirming deletion.
   * @remarks Used by the seeker's Alerts screen.
   */
  deleteAlert: (id: number) => api.delete(`/govtjobs/alerts/${id}/`),
};
