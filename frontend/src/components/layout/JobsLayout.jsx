/**
 * JobsLayout.jsx
 *
 * Layout wrapper for the "jobs & careers" family of public pages: adds a
 * sticky sub-navigation tab bar (Jobs / Companies / Govt Jobs / Freelancing)
 * above the routed page content, rendered via <Outlet />. Nested underneath
 * PublicLayout so it sits below the main Navbar (`top-16` accounts for the
 * navbar's height). Used as the layout route element for /jobs, /companies,
 * /govt-jobs, and /freelancers.
 */
import { NavLink, Outlet, useLocation } from 'react-router-dom'

// Tabs of the Jobs hub. Public site: /jobs, /companies, /govt-jobs, /freelancers.
// Inside the job seeker dashboard the same pages are mounted under /seeker (private
// jobs at /seeker/browse-jobs, since /seeker/jobs is the contractor's My Jobs), so the
// hub keeps the dashboard sidebar.
const JOB_TABS = [
  { label: 'Jobs',        publicTo: '/jobs',        dashboardTo: '/seeker/browse-jobs' },
  { label: 'Companies',   publicTo: '/companies',   dashboardTo: '/seeker/companies' },
  { label: 'Govt Jobs',   publicTo: '/govt-jobs',   dashboardTo: '/seeker/govt-jobs' },
  { label: 'Freelancing', publicTo: '/freelancers', dashboardTo: '/seeker/freelancers' },
]

/** Paths of the hub's tab pages inside the dashboard — SeekerLayout highlights "Jobs" on all of them. */
export const DASHBOARD_JOB_HUB_PATHS = JOB_TABS.map(t => t.dashboardTo)

/**
 * JobsLayout
 *
 * Tab strip (Jobs / Companies / Govt Jobs / Freelancing) above the matched child
 * page. Used twice in App.jsx: inside PublicLayout (sticky under the 64px navbar)
 * and inside SeekerLayout as the dashboard's "Jobs" section (not sticky — the
 * dashboard scrolls its own content area).
 */
export default function JobsLayout() {
  const { pathname } = useLocation()
  const inDashboard = pathname.startsWith('/seeker')
  return (
    <>
      <nav className={inDashboard ? 'border-b mb-2' : 'sticky top-16 z-40 bg-background border-b'}>
        <div className={inDashboard ? 'flex gap-1 overflow-x-auto' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-1 overflow-x-auto'}>
          {/* One tab per JOB_TABS entry, highlighting the tab matching the current route */}
          {JOB_TABS.map(({ label, publicTo, dashboardTo }) => (
            <NavLink
              key={label}
              to={inDashboard ? dashboardTo : publicTo}
              end
              className={({ isActive }) =>
                `px-4 py-3 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
      {/* Matched child route (Jobs, Companies, GovtJobs, or Freelancers page) renders here */}
      <Outlet />
    </>
  )
}
