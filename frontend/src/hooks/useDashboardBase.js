/**
 * useDashboardBase.js — which dashboard the current page is rendered inside.
 *
 * The job-posting pages (pages/company/PostJob.jsx, ManageJobs.jsx) are mounted
 * in two layouts: the company dashboard (/dashboard/post-job, /dashboard/jobs)
 * and the contractor dashboard (/seeker/post-job, /seeker/jobs). Their links
 * and redirects use this base so a contractor never gets bounced into the
 * company dashboard (which ProtectedRoute requireCompany would refuse anyway).
 */
import { useLocation } from 'react-router-dom'

/**
 * Returns '/seeker' when the current URL is inside the job seeker/contractor
 * layout, otherwise '/dashboard'. Used as `${base}/jobs`, `${base}/post-job`.
 */
export function useDashboardBase() {
  const { pathname } = useLocation()
  return pathname.startsWith('/seeker') ? '/seeker' : '/dashboard'
}

/**
 * Prefix for listing links ('/seeker' inside the job seeker/contractor dashboard, ''
 * elsewhere), so opening a tender or govt job from the dashboard keeps the dashboard
 * layout: `${prefix}/tenders/42` → /seeker/tenders/42 or /tenders/42. Used by the
 * Latest tenders / govt jobs lists and the detail pages' back links.
 */
export function useListingPrefix() {
  const { pathname } = useLocation()
  return pathname.startsWith('/seeker') ? '/seeker' : ''
}

/**
 * Base path of the private-job list for the current layout: '/seeker/browse-jobs'
 * inside the job seeker dashboard (so browsing and opening jobs keeps the sidebar),
 * '/jobs' on the public site. Job pages: `${base}` (list), `${base}/<id>` (detail).
 * ('/seeker/jobs' is taken by the contractor's My Jobs page, hence "browse-jobs".)
 */
export function useJobsBase() {
  const { pathname } = useLocation()
  return pathname.startsWith('/seeker') ? '/seeker/browse-jobs' : '/jobs'
}
