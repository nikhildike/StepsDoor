/**
 * services/companyService.ts
 *
 * Thin wrapper around the shared `api` Axios instance for the public
 * company directory endpoint — companies with an active StepsDoor
 * subscription and at least one open job post — plus a single company's
 * branded careers page. Consumed by the Jobs tab's `HomeScreen`, which
 * shows a "Companies Hiring" section below the job list, and by
 * `CompanyCareersScreen`, reached by tapping a company card there.
 * Mirrors `frontend/src/services/companyService.js`.
 */
import api from './api';

export const companyService = {
  /**
   * Lists companies with an active subscription and at least one active job post.
   * @returns Axios response with a paginated (or plain array) list of companies —
   *   each `{ id, name, slug, logo, description, website, active_job_count }`.
   * @remarks Used by the Jobs tab's HomeScreen "Companies Hiring" section.
   */
  list: () => api.get('/companies/public/'),
  /**
   * Fetches one company's branded careers page: profile + all its
   * currently active job listings, in a single call.
   * @param slug - The company's URL slug (from a company list entry's `slug` field).
   * @returns Axios response with `{ company, jobs }`.
   * @remarks Used by `CompanyCareersScreen`, StepsDoor's own hosted
   *   careers page for a subscribed company — this is what a company
   *   card links to, not the company's own external `website` field
   *   (which is often unset and isn't guaranteed to be a careers page anyway).
   */
  careers: (slug: string) => api.get(`/companies/${slug}/careers/`),
};
