/**
 * services/seekerService.ts
 *
 * The job seeker's own data: saved jobs (`backend/apps/jobseekers`), job
 * alerts and the jobs they match (`backend/apps/alerts`), and dashboard
 * counts. A saved job or alert match can be any of three kinds — 'job'
 * (StepsDoor post), 'company' (company careers-page opening) or 'govt'
 * (government job). Mirrors `frontend/src/services/seekerService.js`.
 */
import api from './api';

// The three job kinds a seeker can save or get alert matches for.
export type JobKind = 'job' | 'company' | 'govt';

// SavedJob record field holding the job's id, per kind (backend SavedJob model).
export const SAVED_ID_FIELD: Record<JobKind, 'job_post' | 'career_job' | 'govt_job'> = {
  job: 'job_post',
  company: 'career_job',
  govt: 'govt_job',
};

// One saved job, as returned by SavedJobSerializer (same fields for every kind).
export interface SavedJob {
  id: number; // the bookmark's id (used to unsave)
  kind: JobKind;
  job_post: number | null;
  career_job: number | null;
  govt_job: number | null;
  job_title: string;
  company_name: string;
  city: string; // display location
  redirect_url: string; // where to apply
  deadline: string | null;
  is_open: boolean; // false once the job closed or expired
  job_type: string | null; // StepsDoor posts only
}

// One job matching an alert (apps.jobseekers.listings.describe).
export interface AlertMatch {
  kind: JobKind;
  id: number;
  title: string;
  company: string;
  location: string;
  apply_url: string;
  posted_at: string | null;
  deadline: string | null;
}

// Response of the alert match endpoints.
export interface AlertMatches {
  count: number; // all matching open jobs
  counts: Partial<Record<JobKind, number>>;
  results: AlertMatch[]; // the newest `limit` of them
}

// A job alert (backend JobAlert); blank filters match anything.
export interface JobAlert {
  id: number;
  role_keyword: string;
  city: string;
  job_type: string;
  salary_min: number | null;
  is_active: boolean;
}

export const seekerService = {
  /**
   * The signed-in seeker's saved jobs, newest first.
   * @returns Axios response with `SavedJob[]`.
   * @remarks Used by `store/savedJobsStore.ts` and `SavedJobsScreen`.
   */
  savedJobs: () => api.get('/jobseekers/saved-jobs/'),
  /**
   * Save a job of any kind. Saving an already-saved job returns the existing bookmark.
   * @param id - The job's id.
   * @param kind - 'job' | 'company' | 'govt'.
   * @returns Axios response with the `SavedJob`.
   */
  saveJob: (id: number, kind: JobKind = 'job') =>
    api.post('/jobseekers/saved-jobs/', { [SAVED_ID_FIELD[kind]]: id }),
  /**
   * Remove a saved job.
   * @param savedJobId - The bookmark's id (`SavedJob.id`), not the job's id.
   */
  unsaveJob: (savedJobId: number) => api.delete(`/jobseekers/saved-jobs/${savedJobId}/`),

  /** The seeker's job alerts (`JobAlert[]`). Used by `AlertsScreen`. */
  alerts: () => api.get('/alerts/'),
  /** Create a job alert. @param data - `{ role_keyword, city, is_active }` (other filters optional). */
  createAlert: (data: Partial<JobAlert>) => api.post('/alerts/', data),
  /** Update a job alert (e.g. `{ is_active: false }` to pause it). */
  updateAlert: (id: number, data: Partial<JobAlert>) => api.patch(`/alerts/${id}/`, data),
  /** Delete a job alert. */
  deleteAlert: (id: number) => api.delete(`/alerts/${id}/`),
  /**
   * Open jobs matching one alert across StepsDoor, company careers pages and govt jobs.
   * @param params - `{ limit }` (default 20, max 50).
   * @returns Axios response with `AlertMatches`.
   */
  alertMatches: (id: number, params?: { limit?: number }) => api.get(`/alerts/${id}/matches/`, { params }),
  /** Open jobs matching any active alert, each once. Same shape as `alertMatches`. */
  allAlertMatches: (params?: { limit?: number }) => api.get('/alerts/matches/', { params }),
  /**
   * Role keyword suggestions for the job alert form, from open job titles.
   * @param q - What's been typed (2+ characters, else the API returns []).
   * @returns Axios response with `[{ keyword, count }]`, most common first.
   * @remarks Used by `components/alerts/KeywordInput.tsx`.
   */
  keywordSuggestions: (q: string) => api.get('/alerts/suggestions/', { params: { q } }),
  /** Dashboard counts: `{ saved_jobs, active_alerts, alert_matches, new_jobs_today: {total, job, company, govt} }`. */
  stats: () => api.get('/jobseekers/stats/'),
};
