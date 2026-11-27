/**
 * services/careerService.ts
 *
 * Private-company careers jobs (`backend/apps/careers`): openings read from
 * companies' own ATS feeds (Greenhouse, Lever, Workday, Oracle), India only.
 * Members only — the API 401s guests, so callers check for a token first.
 * Separate from `govtJobService` on purpose. Mirrors
 * `frontend/src/services/careerService.js`.
 */
import api from './api';

export const careerService = {
  /**
   * List open company jobs, newest first.
   * @param params - `search`, `city`, `company` (CareerSource id), `sector`, `page`.
   * @returns Axios response with `{ count, next, results }`.
   * @remarks Used by `components/companies/CompanyOpeningsSection.tsx`.
   */
  list: (params?: object) => api.get('/careers/jobs/', { params }),
  /**
   * Cities that currently have open jobs, with counts (busiest first).
   * @returns Axios response with `[{ city, count }]`.
   * @remarks Used for the openings section's city filter.
   */
  cities: () => api.get('/careers/jobs/cities/'),
  /**
   * Companies that currently have open jobs, with counts (busiest first).
   * @returns Axios response with `[{ id, company_name, sector, careers_url, job_count }]`.
   * @remarks Used for the openings section's company filter.
   */
  companies: () => api.get('/careers/jobs/companies/'),
};
