/**
 * services/tenderService.ts
 *
 * Thin wrapper around the shared `api` Axios instance for the government
 * tender endpoints (scraped from public procurement portals like
 * mahatenders.gov.in, eprocure.gov.in, free to browse) plus the job
 * seeker's TenderAlert subscriptions. Consumed by the Tenders tab's
 * list/detail screens (`screens/tenders/`) and the seeker's Alerts
 * screen. Mirrors `frontend/src/services/tenderService.js`.
 */
import api from './api';

export const tenderService = {
  /**
   * List government tenders, optionally filtered/paginated.
   * @param params - Optional query params (e.g. search, page, filters).
   * @returns Axios response with a paginated list of tenders.
   * @remarks Used by the Tenders list screen.
   */
  list: (params?: object) => api.get('/tenders/', { params }),
  /**
   * Fetch a single tender by id.
   * @param id - Tender's numeric id.
   * @returns Axios response with the tender's full detail.
   * @remarks Used by the Tender detail screen.
   */
  get: (id: number) => api.get(`/tenders/${id}/`),
  /**
   * List the signed-in job seeker's saved tender alert subscriptions.
   * @returns Axios response with the user's TenderAlert records.
   * @remarks Used by the seeker's Alerts screen.
   */
  alerts: () => api.get('/tenders/alerts/'),
  /**
   * Create a new tender alert (matches newly scraped tenders against
   * criteria; dispatched via the backend's `match_tender_alerts` Celery task).
   * @param data - Alert criteria payload (e.g. keywords, category).
   * @returns Axios response with the created alert.
   * @remarks Used by the seeker's Alerts screen.
   */
  createAlert: (data: object) => api.post('/tenders/alerts/', data),
  /**
   * Delete an existing tender alert.
   * @param id - Alert's numeric id.
   * @returns Axios response confirming deletion.
   * @remarks Used by the seeker's Alerts screen.
   */
  deleteAlert: (id: number) => api.delete(`/tenders/alerts/${id}/`),
};
