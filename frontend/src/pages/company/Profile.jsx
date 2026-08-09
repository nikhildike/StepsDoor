import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link2, Copy, Check, ExternalLink } from 'lucide-react'
import { companyService } from '@/services/companyService'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

const schema = z.object({
  name: z.string().min(2, 'Company name is required'),
  contact_email: z.string().email('Enter a valid email'),
  contact_phone: z.string().optional(),
  website: z.string().url('Enter a valid URL').optional().or(z.literal('')),
  description: z.string().optional(),
})

export default function CompanyProfile() {
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [slug, setSlug] = useState('')
  const [copied, setCopied] = useState(false)
  const { register, handleSubmit, reset, formState: { errors, isSubmitting, isDirty } } = useForm({
    resolver: zodResolver(schema),
  })

  const careerUrl = slug ? `${window.location.origin}/careers/${slug}` : null

  const copyUrl = () => {
    if (!careerUrl) return
    navigator.clipboard.writeText(careerUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  useEffect(() => {
    companyService.get()
      .then(res => {
        reset(res.data)
        setSlug(res.data.slug || '')
      })
      .catch(() => setError('Could not load company profile.'))
  }, [reset])

  const onSubmit = async (data) => {
    try {
      setError('')
      setSaved(false)
      await companyService.update(data)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Failed to save changes. Please try again.')
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Company Profile</h1>
        <p className="text-muted-foreground mt-1">Update your company information shown to job seekers.</p>
      </div>

      {careerUrl && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center gap-3">
          <Link2 className="h-4 w-4 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground mb-0.5">Your Career Page URL</p>
            <a href={careerUrl} target="_blank" rel="noopener noreferrer"
              className="text-sm text-primary hover:underline flex items-center gap-1 truncate">
              {careerUrl} <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          </div>
          <button onClick={copyUrl}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-md hover:bg-white transition-colors">
            {copied ? <><Check className="h-3.5 w-3.5 text-green-600" />Copied!</> : <><Copy className="h-3.5 w-3.5" />Copy</>}
          </button>
        </div>
      )}

      {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>}
      {saved && <p className="text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-md">Changes saved successfully.</p>}

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl border border-border p-6 space-y-5">
        <div>
          <label className="text-sm font-medium">Company Name <span className="text-destructive">*</span></label>
          <Input {...register('name')} placeholder="Acme Pvt. Ltd." className="mt-1" />
          {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <label className="text-sm font-medium">Contact Email <span className="text-destructive">*</span></label>
          <Input {...register('contact_email')} type="email" placeholder="hr@yourcompany.com" className="mt-1" />
          {errors.contact_email && <p className="text-xs text-destructive mt-1">{errors.contact_email.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Phone <span className="text-xs text-muted-foreground">optional</span></label>
            <Input {...register('contact_phone')} placeholder="+91 98765 43210" className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium">Website <span className="text-xs text-muted-foreground">optional</span></label>
            <Input {...register('website')} placeholder="https://yourcompany.com" className="mt-1" />
            {errors.website && <p className="text-xs text-destructive mt-1">{errors.website.message}</p>}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">About the Company <span className="text-xs text-muted-foreground">optional</span></label>
          <textarea
            {...register('description')}
            rows={4}
            placeholder="Tell candidates about your company, culture, and mission..."
            className="mt-1 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="pt-2">
          <Button type="submit" disabled={isSubmitting || !isDirty}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  )
}
