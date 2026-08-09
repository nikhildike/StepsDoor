import { useCallback } from 'react'
import { paymentService } from '@/services/paymentService'
import { useAuthStore } from '@/store/authStore'

export function useRazorpay() {
  const { user } = useAuthStore()

  const initiatePayment = useCallback(async (planId, onSuccess) => {
    const { data } = await paymentService.createSubscription(planId)

    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID,
      subscription_id: data.razorpay_subscription_id,
      name: 'Linksdoor',
      description: 'Job Board Subscription',
      prefill: { email: user?.email },
      handler: (response) => onSuccess(response),
    }

    const rzp = new window.Razorpay(options)
    rzp.open()
  }, [user])

  return { initiatePayment }
}
