/**
 * Company Post Job page.
 *
 * Route: `/dashboard/post-job` (nested under the company dashboard layout).
 * Access: company accounts only — mounted behind `ProtectedRoute requireCompany`.
 *
 * Renders the job-posting form used by companies to create a new listing.
 * Note: despite the CLAUDE.md project notes mentioning TipTap for job descriptions,
 * this particular form uses a plain `<textarea>` for the description field, not
 * the TipTap rich text editor — there is no TipTap setup in this file.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { jobService } from '@/services/jobService'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

// Zod validation schema for the job posting form, wired into React Hook Form via zodResolver.
// - title/description/location/city: required text fields with minimum lengths.
// - job_type: must be one of the four supported enum values.
// - redirect_url: required, must be a valid URL — where applicants get redirected to apply.
// - salary_min/salary_max: optional, coerced from string input to number.
// - expires_at: optional date string.
const schema = z.object({
  title: z.string().min(3, 'Title is required'),
  description: z.string().min(20, 'Please provide a detailed description (min 20 characters)'),
  location: z.string().min(2, 'Location is required'),
  city: z.string().min(2, 'City is required'),
  job_type: z.enum(['full_time', 'part_time', 'contract', 'internship'], { required_error: 'Select a job type' }),
  redirect_url: z.string().url('Enter a valid URL where candidates will apply'),
  salary_min: z.coerce.number().optional(),
  salary_max: z.coerce.number().optional(),
  expires_at: z.string().optional(),
})

// Options rendered in the Job Type <select>, paired with the values accepted by the schema/backend.
const JOB_TYPES = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' },
]

/**
 * Renders the "Post a Job" form: title, description, location, job type,
 * application redirect URL, optional salary range, and optional expiry date.
 * On successful submit, creates the job listing and navigates to Manage Jobs.
 */
export default function PostJob() {
  const navigate = useNavigate()
  // Server-side/validation error message shown above the form (network or API errors).
  const [error, setError] = useState('')
  // React Hook Form wiring: register() binds inputs, handleSubmit runs validation via Zod
  // before calling onSubmit, errors holds field-level validation messages.
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  })

  // Form submit handler: fires when the form passes Zod validation and is submitted.
  // Strips empty optional numeric/date fields (so they aren't sent as 0/""), creates
  // the job via POST /jobs/ (jobs app), then redirects to the Manage Jobs list.
  // On failure, surfaces the first validation/API error message returned by the backend.
  const onSubmit = async (data) => {
    try {
      setError('')
      // Remove empty optional fields
      if (!data.salary_min) delete data.salary_min
      if (!data.salary_max) delete data.salary_max
      if (!data.expires_at) delete data.expires_at
      await jobService.create(data)
      navigate('/dashboard/jobs')
    } catch (err) {
      const detail = err?.response?.data
      if (typeof detail === 'object') {
        const first = Object.values(detail).flat()[0]
        setError(typeof first === 'string' ? first : 'Failed to post job.')
      } else {
        setError('Failed to post job. Please try again.')
      }
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Post a Job</h1>
        <p className="text-muted-foreground mt-1">Fill in the details below to create a new listing.</p>
      </div>

      {/* Top-level error banner for network/API failures from onSubmit. */}
      {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 bg-white rounded-xl border border-border p-6">
        <div>
          <label className="text-sm font-medium">Job Title <span className="text-destructive">*</span></label>
          <Input {...register('title')} placeholder="e.g. Senior Software Engineer" className="mt-1" />
          {/* Field-level Zod validation message, shown only when this field fails validation. */}
          {errors.title && <p className="text-xs text-destructive mt-1">{errors.title.message}</p>}
        </div>

        <div>
          <label className="text-sm font-medium">Description <span className="text-destructive">*</span></label>
          {/* Plain textarea (no TipTap rich text editor here) bound via React Hook Form's register(). */}
          <textarea
            {...register('description')}
            rows={6}
            placeholder="Describe the role, responsibilities, and requirements..."
            className="mt-1 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {errors.description && <p className="text-xs text-destructive mt-1">{errors.description.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Location <span className="text-destructive">*</span></label>
            <Input {...register('location')} placeholder="e.g. Bangalore, Karnataka" className="mt-1" />
            {errors.location && <p className="text-xs text-destructive mt-1">{errors.location.message}</p>}
          </div>
          <div>
            <label className="text-sm font-medium">City <span className="text-destructive">*</span></label>
            <Input {...register('city')} placeholder="e.g. Bangalore" className="mt-1" />
            {errors.city && <p className="text-xs text-destructive mt-1">{errors.city.message}</p>}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Job Type <span className="text-destructive">*</span></label>
          <select
            {...register('job_type')}
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Select type...</option>
            {/* Renders one <option> per entry in JOB_TYPES. */}
            {JOB_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          {errors.job_type && <p className="text-xs text-destructive mt-1">{errors.job_type.message}</p>}
        </div>

        <div>
          <label className="text-sm font-medium">Application URL <span className="text-destructive">*</span></label>
          {/* This is the redirect_url stored on the job — job seekers get sent here when they click "Apply". */}
          <Input {...register('redirect_url')} placeholder="https://yourcompany.com/careers/job-id" className="mt-1" />
          <p className="text-xs text-muted-foreground mt-1">Candidates will be redirected here to apply.</p>
          {errors.redirect_url && <p className="text-xs text-destructive mt-1">{errors.redirect_url.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Min Salary (₹/yr) <span className="text-xs text-muted-foreground">optional</span></label>
            <Input {...register('salary_min')} type="number" placeholder="e.g. 600000" className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium">Max Salary (₹/yr) <span className="text-xs text-muted-foreground">optional</span></label>
            <Input {...register('salary_max')} type="number" placeholder="e.g. 1200000" className="mt-1" />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Expires On <span className="text-xs text-muted-foreground">optional</span></label>
          <Input {...register('expires_at')} type="date" className="mt-1" />
        </div>

        <div className="flex gap-3 pt-2">
          {/* Submit button label/disabled state reflects React Hook Form's isSubmitting flag. */}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Posting...' : 'Post Job'}
          </Button>
          {/* Cancel just navigates back to the Manage Jobs list without saving. */}
          <Button type="button" variant="outline" onClick={() => navigate('/dashboard/jobs')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
