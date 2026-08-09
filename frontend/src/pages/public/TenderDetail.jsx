import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { tenderService } from '@/services/tenderService'
import { Spinner } from '@/components/ui/Spinner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ExternalLink, ArrowLeft, Calendar, MapPin, IndianRupee, Building2, Copy, Check, Hash, FileText } from 'lucide-react'

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

function formatINR(amount) {
  if (!amount) return null
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

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

function CopyBtn({ text, label }) {
  const [copied, setCopied] = useState(false)
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

export default function TenderDetail() {
  const { id } = useParams()
  const [tender, setTender] = useState(null)
  const [loading, setLoading] = useState(true)

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
          {/* Badge: state > category (if not other) > source portal */}
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
        Linksdoor is not affiliated with any government body. Verify all details on the official portal before bidding.
      </p>
    </div>
  )
}
