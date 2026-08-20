/**
 * Store Subscription page.
 *
 * Route: `/store/subscription` (nested under the store owner account layout).
 * Access: store owner accounts only.
 *
 * Store subscription page — reuses the same plans/pricing as company subscriptions.
 * Simply re-exports the company Subscription page so both share the same logic;
 * see `frontend/src/pages/company/Subscription.jsx` for the actual implementation
 * (plan listing, current subscription status, Razorpay checkout placeholder).
 */
export { default } from '@/pages/company/Subscription'
