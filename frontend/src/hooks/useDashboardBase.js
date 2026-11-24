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
