import { useAuthStore } from '@/store/authStore'
import { useAuth } from '@/hooks/useAuth'
import { LogOut, Mail } from 'lucide-react'

export default function StoreAccount() {
  const { user } = useAuthStore()
  const { signOut } = useAuth()

  return (
    <div className="max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Account</h1>
        <p className="text-muted-foreground text-sm mt-1">Your Linksdoor account details</p>
      </div>

      <div className="bg-white border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">{user?.email}</p>
            <p className="text-xs text-muted-foreground">Store Owner account</p>
          </div>
        </div>
      </div>

      <button
        onClick={signOut}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </button>
    </div>
  )
}
