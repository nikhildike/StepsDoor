/**
 * SeekerLayout.jsx
 *
 * Page shell for the account section (routes under /seeker/*). Shared by job
 * seekers and contractors; the sidebar nav items and role label adapt to the
 * signed-in user's role:
 *
 *   Job seeker:  Dashboard · Saved Jobs  · Job Alerts    · My Profile
 *   Contractor:  Dashboard · Tenders     · Tender Alerts · My Profile
 *
 * The sidebar starts open on page load and auto-collapses after 5 seconds.
 * A burger button in the persistent top bar re-opens it (and resets the
 * 5-second timer) at any time. The sidebar overlays content rather than
 * pushing it so the main area always uses the full viewport width.
 */
import { useState, useEffect, useRef } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { LayoutDashboard, Bookmark, Bell, User, LogOut, Menu, X, FileText, ShoppingBag, Store, Wrench, PlusCircle, Briefcase, Landmark } from 'lucide-react'
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
  { to: '/seeker/govt-jobs', label: 'Govt Jobs',   icon: Landmark },
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
  return (
    <>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
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
 * Layout route for /seeker/* pages. Renders a persistent top bar (burger
 * button + branding) and a slide-over sidebar that:
 *   - Opens on mount
 *   - Auto-collapses after 5 seconds
 *   - Can be re-opened (or closed) at any time via the burger button
 *   - Closes immediately on route change (nav link click)
 *
 * The sidebar overlays the content area (does not push it), so the main
 * content always occupies the full width.
 *
 * Props: none — reads auth state from useAuth and current route from useLocation.
 */
export default function SeekerLayout() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  // Sidebar starts open so users immediately see the nav on first load.
  const [open, setOpen] = useState(true)
  // Ref holds the auto-collapse timer so it can be cleared on re-open.
  const timerRef = useRef(null)

  const isContractor = !!user?.is_contractor
  const navItems = isContractor ? CONTRACTOR_NAV : SEEKER_NAV
  const roleLabel = isContractor ? 'Contractor' : 'Job Seeker'

  // Whenever the sidebar opens, start (or restart) the 5-second auto-collapse timer.
  useEffect(() => {
    clearTimeout(timerRef.current)
    if (open) {
      timerRef.current = setTimeout(() => setOpen(false), 5000)
    }
    return () => clearTimeout(timerRef.current)
  }, [open])

  // Collapse immediately on route change (user tapped a nav link).
  useEffect(() => { setOpen(false) }, [location.pathname])

  // Toggle handler: flipping open will trigger the useEffect above to
  // restart the 5-second timer.
  const toggleSidebar = () => setOpen(o => !o)

  return (
    <div className="flex flex-col h-screen bg-gray-50">

      {/* Persistent top bar — visible at all screen sizes */}
      <header className="flex items-center px-4 h-14 bg-white border-b shrink-0 z-30">
        {/* Burger button: opens the sidebar and resets the 5-second timer */}
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <div className="ml-3">
          <span className="text-lg font-bold text-primary">StepsDoor</span>
          <span className="ml-2 text-xs text-muted-foreground">{roleLabel}</span>
        </div>
      </header>

      {/* Body: sidebar overlay + main content */}
      <div className="relative flex flex-1 min-h-0">

        {/* Backdrop — dims the content area while the sidebar is open;
            clicking it collapses the sidebar immediately */}
        {open && (
          <div
            className="fixed inset-0 z-20 bg-black/30 top-14"
            onClick={() => setOpen(false)}
          />
        )}

        {/* Slide-over sidebar — translates in from the left when open */}
        <aside
          className={cn(
            'fixed top-14 left-0 bottom-0 z-30 w-64 bg-white border-r flex flex-col shadow-xl transition-transform duration-200',
            open ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="p-5 border-b">
            <span className="text-base font-bold text-primary">StepsDoor</span>
            <p className="text-xs text-muted-foreground mt-0.5">{roleLabel}</p>
          </div>
          <SidebarContent
            user={user}
            signOut={signOut}
            onClose={() => setOpen(false)}
            navItems={navItems}
          />
        </aside>

        {/* Main content — always full width since sidebar overlays */}
        <main className="flex-1 overflow-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>

    </div>
  )
}
