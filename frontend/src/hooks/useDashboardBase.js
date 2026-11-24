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
