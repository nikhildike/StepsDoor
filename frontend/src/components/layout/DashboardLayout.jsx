import { useState, useEffect } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useAuthStore } from '@/store/authStore'
import {
  LayoutDashboard, Briefcase, PlusCircle, BarChart2,
  CreditCard, FileText, Building2, LogOut, Menu, X, Store,
} from 'lucide-react'
import { cn } from '@/utils/cn'

const navItems = [
  { to: '/dashboard',              label: 'Dashboard',     icon: LayoutDashboard, end: true },
  { to: '/dashboard/post-job',     label: 'Post a Job',    icon: PlusCircle },
  { to: '/dashboard/jobs',         label: 'Manage Jobs',   icon: Briefcase },
  { to: '/dashboard/analytics',    label: 'Analytics',     icon: BarChart2 },
  { to: '/dashboard/subscription', label: 'Subscription',  icon: CreditCard },
  { to: '/dashboard/invoices',     label: 'Invoices',      icon: FileText },
  { to: '/dashboard/profile',      label: 'Company Profile', icon: Building2 },
]

function SidebarContent({ signOut, onClose, isStoreOwner }) {
  return (
    <>
      <nav className="flex-1 p-4 space-y-1">
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
      </nav>
      <div className="p-4 border-t space-y-1">
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

export default function DashboardLayout() {
  const { signOut } = useAuth()
  const { user } = useAuthStore()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const isStoreOwner = !!user?.is_store_owner

  useEffect(() => { setOpen(false) }, [location.pathname])

  return (
    <div className="flex h-screen bg-gray-50">

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 bg-white border-r flex-col">
        <div className="p-6 border-b">
          <span className="text-xl font-bold text-primary">Linksdoor</span>
        </div>
        <SidebarContent signOut={signOut} onClose={() => {}} isStoreOwner={isStoreOwner} />
      </aside>

      <div className="flex flex-col flex-1 min-w-0">

        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-4 h-14 bg-white border-b shrink-0">
          <span className="text-lg font-bold text-primary">Linksdoor</span>
          <button
            onClick={() => setOpen(o => !o)}
            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </header>

        {/* Mobile drawer */}
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

        <main className="flex-1 overflow-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>

    </div>
  )
}
