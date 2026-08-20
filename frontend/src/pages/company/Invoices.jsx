/**
 * Company Invoices page.
 *
 * Route: `/dashboard/invoices` (nested under the company dashboard layout).
 * Access: company accounts only — mounted behind `ProtectedRoute requireCompany`.
 *
 * Intended to list and let companies download PDF billing invoices generated
 * by the backend `payments` app (WeasyPrint) once Razorpay subscriptions produce
 * invoices. Currently a static placeholder — no Axios calls are wired up yet,
 * so it always renders the empty state below regardless of subscription status.
 */
import { FileText } from 'lucide-react'

/**
 * Renders the invoices list for the current company. No data fetching is
 * implemented yet; this always shows the "no invoices" empty state.
 */
export default function Invoices() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Invoices</h1>
        <p className="text-muted-foreground mt-1">Download your billing history.</p>
      </div>

      {/* Static empty state — invoice fetching/download (PDF from payments app) is not yet implemented. */}
      <div className="bg-white rounded-xl border border-border p-12 text-center text-muted-foreground">
        <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="font-medium">No invoices yet</p>
        <p className="text-sm mt-1">Invoices will appear here once you subscribe to a plan.</p>
      </div>
    </div>
  )
}
