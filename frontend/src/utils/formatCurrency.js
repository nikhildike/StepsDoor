/**
 * formatCurrency.js — India-locale currency display formatters.
 *
 * Wraps the `Intl.NumberFormat` API with the `en-IN` locale so numbers
 * render with Indian digit grouping (e.g. ₹1,00,000 lakh-style grouping
 * rather than ₹100,000) and the ₹ symbol.
 *
 * Used by job listing/detail pages (salary display) and company-side
 * pages (subscription pricing, invoices).
 */

/**
 * Formats a numeric amount as an Indian Rupee currency string.
 * Uses `maximumFractionDigits: 0` so paise/decimals are dropped — job
 * salaries and subscription prices in this app are always whole rupees.
 *
 * @param {number} amount - The amount in rupees to format.
 * @returns {string} Localized currency string, e.g. "₹1,00,000".
 * Used by: JobDetail, Jobs (salary badges), Pricing, Subscription, Invoices.
 */
export function formatINR(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Formats a min/max salary pair into a human-readable range string,
 * handling the cases where one or both bounds are undisclosed.
 *
 * - Neither min nor max provided -> "Salary not disclosed".
 * - Only min provided (no max) -> open-ended range, e.g. "₹5,00,000+".
 * - Both provided -> en dash separated range, e.g. "₹5,00,000 – ₹8,00,000".
 *
 * @param {number|null|undefined} min - Minimum salary, falsy if unknown.
 * @param {number|null|undefined} max - Maximum salary, falsy if unknown/open-ended.
 * @returns {string} Human-readable salary range for display.
 * Used by: Jobs listing cards, JobDetail page.
 */
export function formatSalaryRange(min, max) {
  if (!min && !max) return 'Salary not disclosed'
  if (!max) return `${formatINR(min)}+`
  return `${formatINR(min)} – ${formatINR(max)}`
}
