/**
 * StoreLayout.jsx
 *
 * Page shell for the storefront/catalogue owner section (routes under
 * /store/*: Overview, Store Profile, Subscription, My Account), plus a
 * secondary nav group linking into the shared company job-posting pages
 * under /dashboard/* (Post a Job, Manage Jobs, Career Page) since a store
 * owner can also post jobs. Renders a persistent sidebar nav on desktop and
 * a collapsible drawer nav on mobile, and renders the active page via
 * <Outlet />.
 */
import { useState, useEffect } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { LayoutDashboard, Store, CreditCard, User, LogOut, Menu, X, PlusCircle, Briefcase, Building2 } from 'lucide-react'
import { cn } from '@/utils/cn'

// Sidebar nav entries for the storefront section itself.
// `end: true` on Overview ensures it's only active on an exact /store match.
const storeNavItems = [
  { to: '/store',              label: 'Overview',      icon: LayoutDashboard, end: true },
  { to: '/store/profile',      label: 'Store Profile', icon: Store            },
  { to: '/store/subscription', label: 'Subscription',  icon: CreditCard       },
  { to: '/store/account',      label: 'My Account',    icon: User             },
]

// Secondary sidebar group linking into the shared company job-posting pages,
// since store owners are also allowed to post/manage job listings.
const jobNavItems = [
  { to: '/dashboard/post-job', label: 'Post a Job',    icon: PlusCircle  },
  { to: '/dashboard/jobs',     label: 'Manage Jobs',   icon: Briefcase   },
  { to: '/dashboard/profile',  label: 'Career Page',   icon: Building2   },
]

/**
 * SidebarContent
 *
 * Internal helper rendering the two nav groups (store management + job
 * posting) and sign-out button shared by both the desktop sidebar <aside>
 * and the mobile slide-out drawer in StoreLayout below.
 *
 * Props:
 * - signOut (function) — logs the current store-owner user out; wired to the Sign Out button.
 * - onClose (function) — called after a nav link is clicked, used to close the mobile drawer.
 */
function SidebarContent({ signOut, onClose }) {
  return (
    <>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {/* Store management nav group */}
        {storeNavItems.map(({ to, label, icon: Icon, end }) => (
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

        <div className="pt-3 pb-1">
          <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Jobs & Career Page</p>
        </div>

        {/* Job-posting nav group (shared company dashboard routes) */}
        {jobNavItems.map(({ to, label, icon: Icon }) => (
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
      <div className="p-4 border-t">
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
 * StoreLayout
 *
 * Layout route for the storefront owner account section. Renders a fixed
 * sidebar (desktop) or a toggleable slide-out drawer (mobile) with
 * navigation, and renders the matched child route in the main content area
 * via <Outlet />.
 *
 * Props: none — reads the signed-in store owner from useAuth and the
 * current route from useLocation.
 *
 * Used as the parent layout element for all /store/* routes (store owner
 * users), wrapping the storefront overview/profile/subscription/account
 * pages in the router config.
 */
export default function StoreLayout() {
  const { signOut } = useAuth()
  const location = useLocation()
  const [open, setOpen] = useState(false)

  // Auto-close the mobile drawer whenever the route changes
  useEffect(() => { setOpen(false) }, [location.pathname])

  return (
    <div className="flex h-screen bg-gray-50">

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 bg-white border-r flex-col">
        <div className="p-6 border-b">
          <span className="text-xl font-bold text-primary">StepsDoor</span>
          <p className="text-xs text-muted-foreground mt-1">Store Owner</p>
        </div>
        <SidebarContent signOut={signOut} onClose={() => {}} />
      </aside>

      <div className="flex flex-col flex-1 min-w-0">

        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-4 h-14 bg-white border-b shrink-0">
          <div>
            <span className="text-lg font-bold text-primary">StepsDoor</span>
            <span className="ml-2 text-xs text-muted-foreground">Store Owner</span>
          </div>
          {/* Toggles the mobile drawer open/closed; icon swaps between hamburger and close */}
          <button
            onClick={() => setOpen(o => !o)}
            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </header>

        {/* Mobile drawer — only rendered while open; backdrop click closes it */}
        {open && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/30 md:hidden"
              onClick={() => setOpen(false)}
            />
            <div className="fixed top-14 left-0 bottom-0 z-40 w-64 bg-white border-r flex flex-col shadow-xl md:hidden overflow-y-auto">
              <SidebarContent signOut={signOut} onClose={() => setOpen(false)} />
            </div>
          </>
        )}

        {/* Active store child route (Overview, Store Profile, Subscription, etc.) renders here */}
        <main className="flex-1 overflow-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>

    </div>
  )
}
