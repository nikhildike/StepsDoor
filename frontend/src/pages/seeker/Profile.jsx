/**
 * Job Seeker Profile page.
 *
 * Route: `/seeker/profile` (nested under the seeker account layout).
 * Access: job seeker accounts only.
 *
 * Lets a job seeker view/edit their personal profile details (first name,
 * last name, phone number).
 */
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { seekerService } from '@/services/seekerService'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

// Zod validation schema for the seeker profile form: only first_name is required.
const schema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().optional(),
  phone: z.string().optional(),
})

/**
 * Renders the job seeker's editable personal profile form.
 */
export default function SeekerProfile() {
  // Whether the "Changes saved successfully" confirmation should currently be shown.
  const [saved, setSaved] = useState(false)
  // Error message shown when loading or saving the profile fails.
  const [error, setError] = useState('')
  // React Hook Form wiring: register() binds inputs, reset() populates the form
  // once profile data loads, isDirty gates the Save button.
  const { register, handleSubmit, reset, formState: { errors, isSubmitting, isDirty } } = useForm({
    resolver: zodResolver(schema),
  })

  // Fetches the seeker's current profile on mount and populates the form via reset(),
  // normalizing missing fields to empty strings.
  // GET /jobseekers/profiles/me/ (jobseekers app).
  useEffect(() => {
    seekerService.profile()
      .then(res => reset({
        first_name: res.data.first_name || '',
        last_name: res.data.last_name || '',
        phone: res.data.phone || '',
      }))
      .catch(() => setError('Could not load profile.'))
  }, [reset])

  // Form submit handler: fires when the profile form passes Zod validation and is submitted.
  // Saves the updated fields and shows a temporary success message.
  // PATCH /jobseekers/profiles/me/ (jobseekers app).
  const onSubmit = async (data) => {
    try {
      setError('')
      setSaved(false)
      await seekerService.updateProfile(data)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Failed to save changes. Please try again.')
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Profile</h1>
        <p className="text-muted-foreground mt-1">Update your personal information.</p>
      </div>

      {/* Error banner for load/save failures. */}
      {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>}
      {/* Temporary success confirmation after a successful save (auto-hides after 3s). */}
      {saved && <p className="text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-md">Changes saved successfully.</p>}

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl border border-border p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">First Name <span className="text-destructive">*</span></label>
            <Input {...register('first_name')} placeholder="Rahul" className="mt-1" />
            {/* Field-level Zod validation message. */}
            {errors.first_name && <p className="text-xs text-destructive mt-1">{errors.first_name.message}</p>}
          </div>
          <div>
            <label className="text-sm font-medium">Last Name</label>
            <Input {...register('last_name')} placeholder="Sharma" className="mt-1" />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Phone <span className="text-xs text-muted-foreground">optional</span></label>
          <Input {...register('phone')} placeholder="+91 98765 43210" className="mt-1" />
        </div>

        <div className="pt-2">
          {/* Disabled while submitting, or when the form has no unsaved changes (isDirty is false). */}
          <Button type="submit" disabled={isSubmitting || !isDirty}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  )
}
