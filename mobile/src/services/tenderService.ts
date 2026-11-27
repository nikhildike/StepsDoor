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
   * Lists the distinct states with at least one active tender, each with a
   * count (curated against a known portal->state map so scraped junk
   * doesn't pollute the list).
   * @returns Axios response with `[{ state, count }]` (no pagination wrapper).
   * @remarks Used to populate the Tenders list screen's "All States" filter picker.
   */
  states: () => api.get('/tenders/states/'),
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
  /** Update a tender alert (e.g. `{ is_active: false }` to pause it). Used by AlertsScreen. */
  updateAlert: (id: number, data: object) => api.patch(`/tenders/alerts/${id}/`, data),
  /**
   * Open tenders matching one tender alert, soonest closing first (same rules as the daily email).
   * @param params - `{ limit }` (default 20, max 50).
   * @returns Axios response with `{ count, results: [tender list fields] }`.
   * @remarks Used by `components/tenders/TenderMatchesList.tsx`.
   */
  alertMatches: (id: number, params?: { limit?: number }) => api.get(`/tenders/alerts/${id}/matches/`, { params }),
  /** Open tenders matching any active tender alert, each once. Same shape as `alertMatches`. */
  allAlertMatches: (params?: { limit?: number }) => api.get('/tenders/alerts/matches/', { params }),
  /** Keyword suggestions from open tenders' titles: `[{ keyword, count }]`. Used by AlertsScreen's tender alert form. */
  keywordSuggestions: (q: string) => api.get('/tenders/alerts/suggestions/', { params: { q } }),
  /** The signed-in user's saved tenders: `[{ id, tender, saved_at, is_open, details }]`. */
  saved: () => api.get('/tenders/saved/'),
  /** Save a tender (idempotent). @param tenderId - The tender's id. */
  save: (tenderId: number) => api.post('/tenders/saved/', { tender: tenderId }),
  /** Remove a saved tender. @param savedId - The bookmark's id (not the tender's). */
  unsave: (savedId: number) => api.delete(`/tenders/saved/${savedId}/`),
  /** Contractor dashboard counts: `{ saved_tenders, active_alerts, alert_matches, new_today, open_tenders }`. */
  stats: () => api.get('/tenders/stats/'),
};

// One saved tender (SavedTenderSerializer): the bookmark plus the tender's list fields.
export interface SavedTender {
  id: number; // the bookmark's id (used to unsave)
  tender: number; // the tender's id
  saved_at: string;
  is_open: boolean; // false once bidding has ended
  details: TenderSummary;
}

// The tender fields cards render (TenderListSerializer subset).
export interface TenderSummary {
  id: number;
  title: string;
  organisation: string;
  state: string;
  category: string;
  estimated_value?: number;
  submission_deadline?: string;
}
