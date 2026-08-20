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
import { NavLink, Outlet } from 'react-router-dom'

// Tab bar entries: each maps to one of the top-level job-related public routes
const JOB_TABS = [
  { to: '/jobs',        label: 'Jobs'         },
  { to: '/companies',   label: 'Companies'    },
  { to: '/govt-jobs',   label: 'Govt Jobs'    },
  { to: '/freelancers', label: 'Freelancing'  },
]

/**
 * JobsLayout
 *
 * Sticky tab navigation shell for job-related public routes, with the active
 * child page rendered underneath via <Outlet />.
 *
 * Props: none.
 *
 * Used as the parent layout route for /jobs, /companies, /govt-jobs, and
 * /freelancers so those pages share a consistent section-switcher tab bar.
 */
export default function JobsLayout() {
  return (
    <>
      <nav className="sticky top-16 z-40 bg-background border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-1">
          {/* Render one tab per JOB_TABS entry, underlining/coloring the tab matching the current route */}
          {JOB_TABS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) =>
                `px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
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
