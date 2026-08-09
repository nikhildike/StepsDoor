import { FileText } from 'lucide-react'

export default function Invoices() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Invoices</h1>
        <p className="text-muted-foreground mt-1">Download your billing history.</p>
      </div>

      <div className="bg-white rounded-xl border border-border p-12 text-center text-muted-foreground">
        <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="font-medium">No invoices yet</p>
        <p className="text-sm mt-1">Invoices will appear here once you subscribe to a plan.</p>
      </div>
    </div>
  )
}
