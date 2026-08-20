/**
 * App.jsx — Top-level route table for the StepsDoor web frontend.
 *
 * Defines every page route (public, company-dashboard, job-seeker, and
 * store-owner sections), the layout wrapper each section renders inside,
 * and the `ProtectedRoute` guard used to gate authenticated sections by
 * role. Also bootstraps the Cuelinks affiliate-link script on mount.
 *
 * Rendered by main.jsx inside `BrowserRouter` + `ThemeProvider`.
 */
import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

// Public pages
import Home from '@/pages/public/Home'
import Jobs from '@/pages/public/Jobs'
import JobDetail from '@/pages/public/JobDetail'
import Tenders from '@/pages/public/Tenders'
import TenderDetail from '@/pages/public/TenderDetail'
import GovtJobs from '@/pages/public/GovtJobs'
import GovtJobDetail from '@/pages/public/GovtJobDetail'
import Companies from '@/pages/public/Companies'
import Pricing from '@/pages/public/Pricing'
import Login from '@/pages/public/Login'
import Register from '@/pages/public/Register'
import CompanyCareers from '@/pages/public/CompanyCareers'
import Freelancers from '@/pages/public/Freelancers'
import Services from '@/pages/public/Services'
import Shopping from '@/pages/public/Shopping'
import RetailStores from '@/pages/public/RetailStores'
import NotFound from '@/pages/public/NotFound'

// Company pages
import Dashboard from '@/pages/company/Dashboard'
import PostJob from '@/pages/company/PostJob'
import ManageJobs from '@/pages/company/ManageJobs'
import Analytics from '@/pages/company/Analytics'
import Subscription from '@/pages/company/Subscription'
import Invoices from '@/pages/company/Invoices'
import CompanyProfile from '@/pages/company/Profile'

// Seeker pages
import SeekerOverview from '@/pages/seeker/Overview'
import SavedJobs from '@/pages/seeker/SavedJobs'
import Alerts from '@/pages/seeker/Alerts'
import SeekerProfile from '@/pages/seeker/Profile'

// Store owner pages
import StoreDashboard from '@/pages/store/Dashboard'
import StoreProfile from '@/pages/store/StoreProfile'
import StoreSubscription from '@/pages/store/StoreSubscription'
import StoreAccount from '@/pages/store/StoreAccount'

// Layout
import PublicLayout from '@/components/layout/PublicLayout'
import DashboardLayout from '@/components/layout/DashboardLayout'
import SeekerLayout from '@/components/layout/SeekerLayout'
import StoreLayout from '@/components/layout/StoreLayout'
import JobsLayout from '@/components/layout/JobsLayout'

/**
 * Route guard used to gate authenticated sections of the app.
 *
 * Redirects to `/login` if there is no auth token at all. When
 * `requireCompany` is set, only company (or store-owner, since store
 * owners are also flagged `is_company`) accounts pass; otherwise
 * redirects to `/`. When `requireStore` is set, only store-owner
 * accounts pass; otherwise redirects to `/`.
 *
 * @param {{ children: import('react').ReactNode, requireCompany?: boolean, requireStore?: boolean }} props
 * @returns {JSX.Element} Either the guarded `children`, or a `<Navigate>` redirect.
 * Used by: the `/dashboard`, `/seeker`, and `/store` route subtrees below.
 */
function ProtectedRoute({ children, requireCompany = false, requireStore = false }) {
  const { user, token } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  // store owners have is_company=true so requireCompany passes; keep explicit check for clarity
  if (requireCompany && !user?.is_company && !user?.is_store_owner) return <Navigate to="/" replace />
  if (requireStore && !user?.is_store_owner) return <Navigate to="/" replace />
  return children
}

/**
 * Root application component: defines the full route table and
 * bootstraps the Cuelinks affiliate-link converter script for the
 * lifetime of the app.
 *
 * @returns {JSX.Element} The `<Routes>` tree for `react-router-dom`.
 * Used by: main.jsx, mounted inside `BrowserRouter` + `ThemeProvider`.
 */
export default function App() {
  // Load Cuelinks auto-affiliate JS once — converts all outbound links on the page at click time.
  // Works for all 500+ Cuelinks merchants including Amazon, Flipkart, Myntra, etc.
  useEffect(() => {
    const sid = import.meta.env.VITE_CUELINKS_PUBLISHER_ID
    if (!sid) return
    const script = document.createElement('script')
    script.src = `https://cl.cuelinks.com/cljs.php?sid=${sid}`
    script.async = true
    document.head.appendChild(script)
    return () => {
      if (document.head.contains(script)) document.head.removeChild(script)
    }
  }, [])

  return (
    <Routes>
      {/* Public routes */}
      <Route element={<PublicLayout />}>
        {/* Home page — no guard */}
        <Route path="/" element={<Home />} />
        {/* Jobs section — shared tab strip via JobsLayout */}
        <Route element={<JobsLayout />}>
          {/* Private job listings browse/search page — no guard */}
          <Route path="/jobs" element={<Jobs />} />
          {/* Company directory listing — no guard */}
          <Route path="/companies" element={<Companies />} />
          {/* Government job listings browse/search page — no guard */}
          <Route path="/govt-jobs" element={<GovtJobs />} />
          {/* Freelancer listings/profiles page — no guard */}
          <Route path="/freelancers" element={<Freelancers />} />
        </Route>
        {/* Single private job listing detail page — no guard */}
        <Route path="/jobs/:id" element={<JobDetail />} />
        {/* Government tender listings browse/search page — no guard */}
        <Route path="/tenders" element={<Tenders />} />
        {/* Single government tender detail page — no guard */}
        <Route path="/tenders/:id" element={<TenderDetail />} />
        {/* Single government job detail page — no guard */}
        <Route path="/govt-jobs/:id" element={<GovtJobDetail />} />
        {/* Services marketing/listing page — no guard */}
        <Route path="/services" element={<Services />} />
        {/* Shopping marketing/listing page — no guard */}
        <Route path="/shopping" element={<Shopping />} />
        {/* Retail stores directory page — no guard */}
        <Route path="/retail-stores" element={<RetailStores />} />
        {/* Subscription pricing/plans comparison page — no guard */}
        <Route path="/pricing" element={<Pricing />} />
        {/* Login form page — no guard */}
        <Route path="/login" element={<Login />} />
        {/* Registration form page — no guard */}
        <Route path="/register" element={<Register />} />
        {/* Public company careers page (per-company job listing by slug) — no guard */}
        <Route path="/careers/:slug" element={<CompanyCareers />} />
      </Route>

      {/* Company dashboard routes — guarded by ProtectedRoute requireCompany
          (allows company accounts and store owners), wrapped in DashboardLayout */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute requireCompany>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        {/* Company dashboard home/overview — guard: requireCompany (inherited) */}
        <Route index element={<Dashboard />} />
        {/* Post a new job listing form — guard: requireCompany (inherited) */}
        <Route path="post-job" element={<PostJob />} />
        {/* Manage/edit the company's existing job listings — guard: requireCompany (inherited) */}
        <Route path="jobs" element={<ManageJobs />} />
        {/* Job posting analytics/click dashboard — guard: requireCompany (inherited) */}
        <Route path="analytics" element={<Analytics />} />
        {/* Manage/upgrade subscription plan — guard: requireCompany (inherited) */}
        <Route path="subscription" element={<Subscription />} />
        {/* View/download billing invoices — guard: requireCompany (inherited) */}
        <Route path="invoices" element={<Invoices />} />
        {/* Edit company profile details — guard: requireCompany (inherited) */}
        <Route path="profile" element={<CompanyProfile />} />
      </Route>

      {/* Seeker routes — guarded by ProtectedRoute (any authenticated user),
          wrapped in SeekerLayout */}
      <Route
        path="/seeker"
        element={
          <ProtectedRoute>
            <SeekerLayout />
          </ProtectedRoute>
        }
      >
        {/* Job seeker dashboard/overview — guard: authenticated (inherited) */}
        <Route index element={<SeekerOverview />} />
        {/* List of jobs the seeker has bookmarked/saved — guard: authenticated (inherited) */}
        <Route path="saved" element={<SavedJobs />} />
        {/* Manage job alert subscriptions — guard: authenticated (inherited) */}
        <Route path="alerts" element={<Alerts />} />
        {/* Edit job seeker profile — guard: authenticated (inherited) */}
        <Route path="profile" element={<SeekerProfile />} />
      </Route>

      {/* Store owner routes — guarded by ProtectedRoute requireStore
          (store-owner accounts only), wrapped in StoreLayout */}
      <Route
        path="/store"
        element={
          <ProtectedRoute requireStore>
            <StoreLayout />
          </ProtectedRoute>
        }
      >
        {/* Store owner dashboard/overview — guard: requireStore (inherited) */}
        <Route index element={<StoreDashboard />} />
        {/* Edit storefront/catalogue profile — guard: requireStore (inherited) */}
        <Route path="profile" element={<StoreProfile />} />
        {/* Manage/upgrade store subscription plan — guard: requireStore (inherited) */}
        <Route path="subscription" element={<StoreSubscription />} />
        {/* Manage store account settings — guard: requireStore (inherited) */}
        <Route path="account" element={<StoreAccount />} />
      </Route>

      {/* Catch-all 404 page for any unmatched route — no guard */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
