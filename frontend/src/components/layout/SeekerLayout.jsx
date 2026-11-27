/**
 * SeekerLayout.jsx
 *
 * Page shell for the account section (routes under /seeker/*). Shared by job
 * seekers and contractors; the sidebar nav items and role label adapt to the
 * signed-in user's role:
 *
 *   Job seeker:  Dashboard · Jobs (private / companies / govt / freelancing tabs) · Saved Jobs · Alerts · My Profile
 *   Contractor:  Dashboard · Tenders · Saved Tenders · Tender Alerts · Post a Job · My Jobs · My Profile
 *   (plus Shopping / Retail Stores / Services for both)
 *
 * From the md breakpoint (768px) up the sidebar is always open beside the
 * content, like the company and store dashboards; on phones it's a drawer
 * behind the burger button in the top bar.
 */
import { useState, useEffect } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { DASHBOARD_JOB_HUB_PATHS } from '@/components/layout/JobsLayout'
import { useAuth } from '@/hooks/useAuth'
import { LayoutDashboard, Bookmark, Bell, User, LogOut, Menu, X, FileText, ShoppingBag, Store, Wrench, PlusCircle, Briefcase } from 'lucide-react'
import { cn } from '@/utils/cn'

// Browse links shown to job seekers and contractors. They point at /seeker/* copies
// of the public pages (see App.jsx) so the sidebar stays visible — linking to the
// public /shopping etc. used to drop the user out of their dashboard.
const BROWSE_NAV = [
  { to: '/seeker/shopping',      label: 'Shopping',      icon: ShoppingBag },
  { to: '/seeker/retail-stores', label: 'Retail Stores', icon: Store },
  { to: '/seeker/services',      label: 'Services',      icon: Wrench },
]

// Nav items shown to job seekers.
const SEEKER_NAV = [
  { to: '/seeker',         label: 'Dashboard',     icon: LayoutDashboard, end: true },
  // The Jobs hub: private jobs, companies, govt jobs and freelancing tabs (JobsLayout).
  { to: '/seeker/browse-jobs', label: 'Jobs',      icon: Briefcase, activeFor: DASHBOARD_JOB_HUB_PATHS },
  { to: '/seeker/saved',   label: 'Saved Jobs',    icon: Bookmark },
  { to: '/seeker/alerts',  label: 'Alerts',        icon: Bell }, // job + government job alerts
  { to: '/seeker/profile', label: 'My Profile',    icon: User },
]

// Nav items shown to contractors — tender-focused, no saved-jobs entry, plus
// posting/managing their own job listings (/seeker/post-job, /seeker/jobs).
// "Tenders" links to /seeker/tenders so the sidebar stays visible (that
// route renders the public Tenders page inside the seeker layout).
const CONTRACTOR_NAV = [
  { to: '/seeker',          label: 'Dashboard',     icon: LayoutDashboard, end: true },
  { to: '/seeker/tenders',  label: 'Tenders',       icon: FileText },
  { to: '/seeker/saved-tenders', label: 'Saved Tenders', icon: Bookmark },
  { to: '/seeker/alerts',   label: 'Tender Alerts', icon: Bell },
  { to: '/seeker/post-job', label: 'Post a Job',    icon: PlusCircle },
  { to: '/seeker/jobs',     label: 'My Jobs',       icon: Briefcase },
  { to: '/seeker/profile',  label: 'My Profile',    icon: User },
]

/**
 * SidebarContent
 *
 * Renders the nav links, signed-in user email, and Sign Out button inside
 * the collapsible sidebar panel.
 *
 * @param {{ user: object|null, signOut: function, onClose: function, navItems: Array }} props
 *   - user     — signed-in user; email shown above Sign Out.
 *   - signOut  — clears auth and navigates to /login.
 *   - onClose  — called when a nav link is clicked to collapse the sidebar.
 *   - navItems — role-appropriate nav list (SEEKER_NAV or CONTRACTOR_NAV).
 */
function SidebarContent({ user, signOut, onClose, navItems }) {
  const { pathname } = useLocation()
  // An item with `activeFor` (the Jobs hub) is highlighted on any of those paths and their sub-pages.
  const hubActive = (paths) => paths?.some(p => pathname === p || pathname.startsWith(`${p}/`))
  return (
    <>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon, end, activeFor }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onClose}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              isActive || hubActive(activeFor)
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}

        {/* Browse section — public pages accessible from any account type */}
        <div className="pt-3 pb-1">
          <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Browse</p>
        </div>
        {BROWSE_NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t space-y-1">
        {user && (
          <p className="px-3 py-1 text-xs text-muted-foreground truncate">{user.email}</p>
        )}
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </>
  )
}

/**
 * SeekerLayout
 *
 * Layout route for /seeker/* pages (job seekers and contractors). A top bar
 * (branding + role) sits above a sidebar and the page content:
 *   - Desktop/tablet (md, 768px+): the sidebar is always open, as a column
 *     beside the content — the same as the company and store-owner dashboards
 *     (both DashboardLayout).
 *   - Phones: the sidebar is a slide-over drawer opened by the burger button;
 *     it closes on navigation (route change) or a tap on the backdrop.
 *
 * Props: none — reads auth state from useAuth and current route from useLocation.
 */
export default function SeekerLayout() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  // Phone drawer open/closed. Has no effect at md+ where the sidebar is always shown.
  const [open, setOpen] = useState(false)

  const isContractor = !!user?.is_contractor
  const navItems = isContractor ? CONTRACTOR_NAV : SEEKER_NAV
  const roleLabel = isContractor ? 'Contractor' : 'Job Seeker'

  // Close the phone drawer after navigating (the user tapped a nav link).
  useEffect(() => { setOpen(false) }, [location.pathname])

  return (
    <div className="flex flex-col h-screen bg-gray-50">

      {/* Top bar — all screen sizes; the burger is phone-only */}
      <header className="flex items-center px-4 h-14 bg-white border-b shrink-0 z-30">
        <button
          onClick={() => setOpen(o => !o)}
          className="md:hidden p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <div className="ml-3 md:ml-0">
          <span className="text-lg font-bold text-primary">StepsDoor</span>
          <span className="ml-2 text-xs text-muted-foreground">{roleLabel}</span>
        </div>
      </header>

      <div className="relative flex flex-1 min-h-0">

        {/* Phone-only backdrop while the drawer is open; tapping it closes the drawer */}
        {open && (
          <div className="fixed inset-0 z-20 bg-black/30 top-14 md:hidden" onClick={() => setOpen(false)} />
        )}

        {/* Sidebar — a fixed slide-over drawer on phones, an always-visible column from md up */}
        <aside
          className={cn(
            'fixed top-14 left-0 bottom-0 z-30 w-64 bg-white border-r flex flex-col shadow-xl transition-transform duration-200 overflow-y-auto',
            'md:static md:z-auto md:translate-x-0 md:shadow-none md:shrink-0',
            open ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <SidebarContent
            user={user}
            signOut={signOut}
            onClose={() => setOpen(false)}
            navItems={navItems}
          />
        </aside>

        <main className="flex-1 min-w-0 overflow-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>

    </div>
  )
}
