/**
 * TenderDetail.jsx
 *
 * Public detail page for a single scraped government tender. Mounted at
 * `/tenders/:id` (see App.jsx). Fetches the tender by id via
 * `tenderService.get` and renders its metadata plus links to the source
 * portal / tender document. No auth required — tenders are free to browse.
 */
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { tenderService } from '@/services/tenderService'
import { Spinner } from '@/components/ui/Spinner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ExternalLink, ArrowLeft, Calendar, MapPin, IndianRupee, Building2, Copy, Check, Hash, FileText } from 'lucide-react'

// Tender category value -> display label (mirrors the backend Tender.category choices)
const CATEGORIES = [
  { value: 'civil', label: 'Civil Works' },
  { value: 'it', label: 'IT & Software' },
  { value: 'supply', label: 'Supply of Goods' },
  { value: 'transport', label: 'Transport' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'education', label: 'Education' },
  { value: 'defence', label: 'Defence' },
  { value: 'power', label: 'Power & Energy' },
]

// Formats a numeric amount as INR currency (e.g. 150000 -> "₹1,50,000"); returns null when falsy so InfoRow can hide the row
function formatINR(amount) {
  if (!amount) return null
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
}

// Formats an ISO date string into "DD Mon YYYY" (en-IN locale); returns an em-dash placeholder when missing
function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Labeled row showing one field of tender metadata; renders nothing if value is falsy (keeps the grid free of empty rows)
function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-0">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  )
}

// Small button that copies `text` to the clipboard and flashes a "Copied!" state for 2s
function CopyBtn({ text, label }) {
  const [copied, setCopied] = useState(false) // controls the icon/label swap after a successful copy
  // Click handler: writes to the clipboard, then resets the "Copied!" state after 2 seconds
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm border border-border bg-muted hover:bg-muted/70 text-muted-foreground transition-colors"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copied!' : `Copy ${label}`}
    </button>
  )
}

/**
 * Renders the full detail view for one tender: title, IDs (with copy
 * buttons), organisation/location/date metadata, an optional free-text
 * description, and outbound links to the official portal and any
 * downloadable document. Used when a job seeker/browser clicks a tender
 * from the Tenders listing page.
 */
export default function TenderDetail() {
  const { id } = useParams() // tender id from the /tenders/:id route
  const [tender, setTender] = useState(null)
  const [loading, setLoading] = useState(true)

  // Fetch the tender by id whenever the route param changes; re-runs if the
  // user navigates directly from one tender detail page to another.
  useEffect(() => {
    tenderService.get(id).then(({ data }) => setTender(data)).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="flex justify-center py-24"><Spinner /></div>
  if (!tender) return <p className="text-center py-24 text-muted-foreground">Tender not found.</p>

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/tenders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to Tenders
      </Link>

      <div className="bg-white border rounded-lg p-8">
        {/* Title + copy actions */}
        <div className="mb-4">
          {/* Badge: state > category (if not other) > source portal.
              IIFE picks the first available/meaningful value so the badge
              never shows the generic "other" category. */}
          {(() => {
            const categoryLabel = CATEGORIES.find(c => c.value === tender.category)?.label
            const badgeText = tender.state
              || (tender.category !== 'other' && categoryLabel)
              || tender.source_portal
            return badgeText ? <Badge variant="secondary" className="mb-3">{badgeText}</Badge> : null
          })()}
          <h1 className="text-xl font-bold text-foreground leading-snug">{tender.title}</h1>

          {/* Tender ID (NIC system ID from detail page) */}
          {tender.reference_number && (
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <Hash className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground">Tender ID</span>
              <span className="text-sm font-mono text-foreground">{tender.reference_number}</span>
            </div>
          )}

          {/* NIT / Reference No. */}
          {tender.tender_id && (
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <Hash className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground">{tender.reference_number ? 'Reference No.' : 'Tender ID'}</span>
              <span className="text-sm font-mono text-foreground">{tender.tender_id}</span>
            </div>
          )}

          {/* Copy buttons */}
          <div className="mt-3 flex flex-wrap gap-2">
            <CopyBtn text={tender.title} label="Title" />
            {tender.reference_number && <CopyBtn text={tender.reference_number} label="Tender ID" />}
            {tender.tender_id && <CopyBtn text={tender.tender_id} label={tender.reference_number ? 'Reference No.' : 'Tender ID'} />}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-x-8 mt-6">
          <div>
            <InfoRow icon={Building2} label="Organisation" value={tender.organisation} />
            <InfoRow icon={MapPin} label="Location" value={[tender.district, tender.state].filter(Boolean).join(', ')} />
            <InfoRow icon={Calendar} label="Published" value={formatDate(tender.published_at)} />
            <InfoRow icon={Calendar} label="Submission Deadline" value={formatDate(tender.submission_deadline)} />
            <InfoRow icon={Calendar} label="Opening Date" value={formatDate(tender.opening_date)} />
          </div>
          <div>
            <InfoRow icon={IndianRupee} label="Estimated Value" value={formatINR(tender.estimated_value)} />
            <InfoRow icon={IndianRupee} label="Document Fee" value={formatINR(tender.document_fee)} />
            <InfoRow icon={IndianRupee} label="EMD Amount" value={formatINR(tender.emd_amount)} />
          </div>
        </div>

        {tender.description && (
          <div className="mt-6 pt-6 border-t">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Description</h2>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{tender.description}</p>
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <Button href={tender.source_url} target="_blank" rel="noopener noreferrer">
            View on Official Portal <ExternalLink className="h-4 w-4" />
          </Button>
          {tender.document_url && (
            <Button variant="outline" href={tender.document_url} target="_blank" rel="noopener noreferrer">
              Download Document <ExternalLink className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <p className="mt-6 text-xs text-muted-foreground text-center">
        This tender notice was sourced from <strong>{tender.source_portal}</strong>.
        StepsDoor is not affiliated with any government body. Verify all details on the official portal before bidding.
      </p>
    </div>
  )
}
