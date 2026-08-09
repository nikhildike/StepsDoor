import { useEffect } from 'react'
import { useSubscriptionStore } from '@/store/subscriptionStore'
import { subscriptionService } from '@/services/subscriptionService'

export function useSubscription() {
  const { subscription, plans, setSubscription, setPlans } = useSubscriptionStore()

  useEffect(() => {
    subscriptionService.status().then(({ data }) => setSubscription(data)).catch(() => {})
    subscriptionService.plans().then(({ data }) => setPlans(data)).catch(() => {})
  }, [])

  return { subscription, plans }
}
