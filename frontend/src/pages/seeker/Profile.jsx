import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { seekerService } from '@/services/seekerService'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

const schema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().optional(),
  phone: z.string().optional(),
})

export default function SeekerProfile() {
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const { register, handleSubmit, reset, formState: { errors, isSubmitting, isDirty } } = useForm({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    seekerService.profile()
      .then(res => reset({
        first_name: res.data.first_name || '',
        last_name: res.data.last_name || '',
        phone: res.data.phone || '',
      }))
      .catch(() => setError('Could not load profile.'))
  }, [reset])

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

      {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>}
      {saved && <p className="text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-md">Changes saved successfully.</p>}

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl border border-border p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">First Name <span className="text-destructive">*</span></label>
            <Input {...register('first_name')} placeholder="Rahul" className="mt-1" />
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
          <Button type="submit" disabled={isSubmitting || !isDirty}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  )
}
