/**
 * useRazorpay.js — Razorpay Subscriptions checkout integration.
 *
 * Drives the client side of the subscription payment flow: asks the
 * backend to create a Razorpay subscription, then opens the Razorpay
 * Checkout widget (loaded globally as `window.Razorpay` via the
 * Razorpay checkout.js script tag, expected to already be present on
 * the page — see index.html) for the user to complete payment.
 *
 * Used by company-side pages that sell subscriptions, e.g.
 * pages/company/Subscription and pages/public/Pricing (upgrade CTA).
 */
import { useCallback } from 'react'
import { paymentService } from '@/services/paymentService'
import { useAuthStore } from '@/store/authStore'

/**
 * Provides `initiatePayment`, which drives the full Razorpay Subscriptions
 * checkout flow for a given plan.
 *
 * @returns {{ initiatePayment: (planId: string|number, onSuccess: (response: object) => void) => Promise<void> }}
 * Used by: pages/company/Subscription, pages/public/Pricing.
 */
export function useRazorpay() {
  const { user } = useAuthStore()

  /**
   * Starts checkout for the given subscription plan.
   *
   * Flow:
   * 1. Order/subscription creation — calls the backend
   *    (`paymentService.createSubscription`) to create a Razorpay
   *    subscription server-side (via the Razorpay API using our secret
   *    key) and returns a `razorpay_subscription_id` the client can
   *    safely reference without ever touching the secret key.
   * 2. Configures the Checkout widget options: public `key` (from Vite
   *    env, safe to expose client-side), the `subscription_id` just
   *    created, display name/description shown in the widget, and
   *    `prefill.email` to save the user re-typing their email.
   * 3. Opens the checkout widget — instantiates `window.Razorpay` with
   *    those options and calls `.open()`, which renders Razorpay's own
   *    hosted payment UI (cards/UPI/netbanking) in an overlay.
   * 4. Success callback — Razorpay invokes `handler` with a response
   *    payload (payment/signature IDs) once the user completes payment
   *    inside the widget; that payload is forwarded to the caller-supplied
   *    `onSuccess` so the caller can confirm/verify the payment
   *    (typically via another backend call) and update UI state.
   *    Note: there is no explicit failure/dismiss callback wired up here
   *    (e.g. no `modal.ondismiss`) — if the user cancels or payment
   *    fails, `onSuccess` simply never fires.
   *
   * @param {string|number} planId - ID of the subscription plan to purchase.
   * @param {(response: object) => void} onSuccess - Called with Razorpay's
   *   checkout response object once payment succeeds inside the widget.
   * @returns {Promise<void>}
   */
  const initiatePayment = useCallback(async (planId, onSuccess) => {
    // Step 1: create the subscription order on the backend (Razorpay API
    // call happens server-side, using the secret key).
    const { data } = await paymentService.createSubscription(planId)

    // Step 2: build the Checkout widget config. Only the public key is
    // used client-side; prefill.email improves UX by skipping re-entry.
    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID,
      subscription_id: data.razorpay_subscription_id,
      name: 'StepsDoor',
      description: 'Job Board Subscription',
      prefill: { email: user?.email },
      // Step 4: success callback — fired by Razorpay once the user
      // completes payment in the widget; response contains payment/signature
      // IDs the caller can send back to the backend for verification.
      handler: (response) => onSuccess(response),
    }

    // Step 3: instantiate and open the Razorpay-hosted checkout overlay.
    const rzp = new window.Razorpay(options)
    rzp.open()
  }, [user])

  return { initiatePayment }
}
