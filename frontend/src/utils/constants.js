/**
 * constants.js — App-wide static constants for the StepsDoor web frontend.
 *
 * Grouped by concern:
 *  - JOB_TYPES: dropdown/filter options for job listings (job post/search forms).
 *  - INDIAN_CITIES: dropdown/filter options for location fields, scoped to the
 *    Indian job market this SaaS targets ("Remote" included as a pseudo-city).
 *  - API_URL: base URL for the Django REST API, resolved from the Vite env.
 *
 * Consumed by filter/search UI (e.g. Jobs listing, PostJob form) and by
 * `frontend/src/services/api.js` for the Axios base URL.
 */

/**
 * Job type options used in job posting forms and job search/filter UI.
 * `value` is the backend-facing enum sent to the API; `label` is the
 * human-readable text shown in selects/badges.
 * @type {{value: string, label: string}[]}
 */
export const JOB_TYPES = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' },
]

/**
 * List of Indian cities offered as location filter/select options across
 * job, tender, and govt-job search UIs. "Remote" is included as a
 * non-geographic option for remote-friendly listings.
 * @type {string[]}
 */
export const INDIAN_CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai',
  'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Surat',
  'Remote',
]

// Base URL for the Django REST API. Falls back to the local dev server
// when VITE_API_URL is not set in frontend/.env (e.g. fresh checkout).
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
