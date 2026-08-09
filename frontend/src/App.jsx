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

function ProtectedRoute({ children, requireCompany = false, requireStore = false }) {
  const { user, token } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  // store owners have is_company=true so requireCompany passes; keep explicit check for clarity
  if (requireCompany && !user?.is_company && !user?.is_store_owner) return <Navigate to="/" replace />
  if (requireStore && !user?.is_store_owner) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/jobs/:id" element={<JobDetail />} />
        <Route path="/tenders" element={<Tenders />} />
        <Route path="/tenders/:id" element={<TenderDetail />} />
        <Route path="/govt-jobs" element={<GovtJobs />} />
        <Route path="/govt-jobs/:id" element={<GovtJobDetail />} />
        <Route path="/companies" element={<Companies />} />
        <Route path="/freelancers" element={<Freelancers />} />
        <Route path="/services" element={<Services />} />
        <Route path="/shopping" element={<Shopping />} />
        <Route path="/retail-stores" element={<RetailStores />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/careers/:slug" element={<CompanyCareers />} />
      </Route>

      {/* Company dashboard routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute requireCompany>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="post-job" element={<PostJob />} />
        <Route path="jobs" element={<ManageJobs />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="subscription" element={<Subscription />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="profile" element={<CompanyProfile />} />
      </Route>

      {/* Seeker routes */}
      <Route
        path="/seeker"
        element={
          <ProtectedRoute>
            <SeekerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<SeekerOverview />} />
        <Route path="saved" element={<SavedJobs />} />
        <Route path="alerts" element={<Alerts />} />
        <Route path="profile" element={<SeekerProfile />} />
      </Route>

      {/* Store owner routes */}
      <Route
        path="/store"
        element={
          <ProtectedRoute requireStore>
            <StoreLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<StoreDashboard />} />
        <Route path="profile" element={<StoreProfile />} />
        <Route path="subscription" element={<StoreSubscription />} />
        <Route path="account" element={<StoreAccount />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
