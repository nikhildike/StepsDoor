/**
 * DashboardLayout.jsx
 *
 * Page shell for the company dashboard section of the app (routes under
 * /dashboard/*: Dashboard home, Post a Job, Manage Jobs, Analytics,
 * Subscription, Invoices, Company Profile). Renders a persistent sidebar nav
 * on desktop and a collapsible drawer nav on mobile, and renders the active
 * dashboard page via <Outlet />. Used as the layout route element for all
 * company-only pages behind ProtectedRoute requireCompany.
 */
import { useState, useEffect } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useAuthStore } from '@/store/authStore'
import {
  LayoutDashboard, Briefcase, PlusCircle, BarChart2,
  CreditCard, FileText, Building2, LogOut, Menu, X, Store,
} from 'lucide-react'
import { cn } from '@/utils/cn'

// Primary sidebar navigation entries for the company dashboard.
// `end: true` on the Dashboard home item ensures NavLink only marks it
// active on an exact /dashboard match (not for every nested /dashboard/* route).
const navItems = [
  { to: '/dashboard',              label: 'Dashboard',     icon: LayoutDashboard, end: true },
  { to: '/dashboard/post-job',     label: 'Post a Job',    icon: PlusCircle },
  { to: '/dashboard/jobs',         label: 'Manage Jobs',   icon: Briefcase },
  { to: '/dashboard/analytics',    label: 'Analytics',     icon: BarChart2 },
  { to: '/dashboard/subscription', label: 'Subscription',  icon: CreditCard },
  { to: '/dashboard/invoices',     label: 'Invoices',      icon: FileText },
  { to: '/dashboard/profile',      label: 'Company Profile', icon: Building2 },
]

/**
 * SidebarContent
 *
 * Internal helper rendering the nav links + sign-out button shared by both
 * the desktop sidebar <aside> and the mobile slide-out drawer in
 * DashboardLayout below. Not exported — exists only to avoid duplicating the
 * nav markup between the two responsive layouts.
 *
 * Props:
 * - signOut (function) — logs the current company user out; wired to the Sign Out button.
 * - onClose (function) — called after a nav link is clicked, used to close the mobile drawer.
 * - isStoreOwner (boolean) — when true, also renders a "My Store" link to the storefront dashboard.
 */
function SidebarContent({ signOut, onClose, isStoreOwner }) {
  return (
    <>
      <nav className="flex-1 p-4 space-y-1">
        {/* Render each primary nav item, highlighting the active route via NavLink's isActive */}
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onClose}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              // Active route gets the solid primary-color pill; inactive routes get the muted hover style
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
        {/* Extra link to the storefront dashboard, only shown for company users who also own a store */}
        {isStoreOwner && (
          <NavLink
            to="/store"
            onClick={onClose}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <Store className="h-4 w-4" />
            My Store
          </NavLink>
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
 * DashboardLayout
 *
 * Layout route for the company dashboard section. Renders a fixed sidebar
 * (desktop) or a toggleable slide-out drawer (mobile) with navigation, and
 * renders the matched child route in the main content area via <Outlet />.
 *
 * Props: none — reads the signed-in user/company from useAuth/useAuthStore
 * and the current route from useLocation.
 *
 * Used as the parent layout element for all /dashboard/* routes (company
 * users only), e.g. wraps Dashboard, PostJob, ManageJobs, Analytics,
 * Subscription, Invoices, Profile pages in the router config.
 */
export default function DashboardLayout() {
  const { signOut } = useAuth()
  const { user } = useAuthStore()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  // Store-owner companies get an extra "My Store" nav link (see SidebarContent above)
  const isStoreOwner = !!user?.is_store_owner

  // Auto-close the mobile drawer whenever the route changes (e.g. after navigating via a nav link)
  useEffect(() => { setOpen(false) }, [location.pathname])

  return (
    <div className="flex h-screen bg-gray-50">

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 bg-white border-r flex-col">
        <div className="p-6 border-b">
          <span className="text-xl font-bold text-primary">StepsDoor</span>
        </div>
        <SidebarContent signOut={signOut} onClose={() => {}} isStoreOwner={isStoreOwner} />
      </aside>

      <div className="flex flex-col flex-1 min-w-0">

        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-4 h-14 bg-white border-b shrink-0">
          <span className="text-lg font-bold text-primary">StepsDoor</span>
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
              <SidebarContent signOut={signOut} onClose={() => setOpen(false)} isStoreOwner={isStoreOwner} />
            </div>
          </>
        )}

        {/* Active dashboard child route (Dashboard, PostJob, ManageJobs, etc.) renders here */}
        <main className="flex-1 overflow-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>

    </div>
  )
}
