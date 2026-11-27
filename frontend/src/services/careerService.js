/**
 * API domain: private-company careers jobs (`backend/apps/careers`) — openings
 * read from companies' own ATS feeds (Greenhouse, Lever, Workday, Oracle).
 * Members only: the API 401s anonymous calls, so callers must check for a
 * token first (see CLAUDE.md "Members-only scraped data"). Separate from
 * `govtJobService` on purpose.
 */
import api from './api'

export const careerService = {
  /**
   * Lists open company jobs, newest first.
   *
   * Endpoint: GET /careers/jobs/
   * @param {Object} [params] - `search`, `city`, `company` (source id), `sector`, `ordering`, `page`.
   * @returns {Promise} Axios response promise resolving to `{count, results}`.
   * Used by: `components/companies/LatestCompanyJobs.jsx`.
   */
  list: (params) => api.get('/careers/jobs/', { params }),

  /**
   * Cities that currently have open jobs, with counts (busiest first), for the city filter.
   *
   * Endpoint: GET /careers/jobs/cities/
   * @returns {Promise} Axios response promise resolving to `[{city, count}]`.
   * Used by: `components/companies/LatestCompanyJobs.jsx`.
   */
  cities: () => api.get('/careers/jobs/cities/'),

  /**
   * Companies that currently have open jobs, with counts, for the company filter.
   *
   * Endpoint: GET /careers/jobs/companies/
   * @returns {Promise} Axios response promise resolving to `[{id, company_name, sector, careers_url, job_count}]`.
   * Used by: `components/companies/LatestCompanyJobs.jsx`.
   */
  companies: () => api.get('/careers/jobs/companies/'),
}
