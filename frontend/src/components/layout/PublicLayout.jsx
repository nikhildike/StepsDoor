/**
 * PublicLayout.jsx
 *
 * Top-level layout wrapper for all public (unauthenticated-accessible) pages:
 * Home, Jobs, Tenders, GovtJobs, Companies, Pricing, Login, Register, etc.
 * Composes the desktop Navbar, the routed page content via <Outlet />, the
 * Footer, and the mobile-only MobileBottomNav. `pb-16 md:pb-0` on <main>
 * reserves space for the fixed bottom nav on mobile so page content isn't
 * hidden behind it. Used as the layout route element for the public route
 * tree in the router config.
 */
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import MobileBottomNav from './MobileBottomNav'

/**
 * PublicLayout
 *
 * Root layout for public-facing pages: header (Navbar), routed content,
 * footer (Footer), and mobile bottom nav (MobileBottomNav).
 *
 * Props: none.
 *
 * Used as the parent layout route wrapping every page under `pages/public/`
 * (Home, Jobs, JobDetail, Tenders, TenderDetail, GovtJobs, GovtJobDetail,
 * Companies, Pricing, Login, Register, etc.) in the router configuration.
 */
export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pb-16 md:pb-0">
        {/* Active public page renders here */}
        <Outlet />
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  )
}
