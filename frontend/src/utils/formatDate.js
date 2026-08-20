/**
 * formatDate.js — India-locale date display formatters.
 *
 * Provides an absolute date formatter (`formatDate`) and a relative
 * "time ago" formatter (`timeAgo`) used across job/tender/govt-job
 * listing and detail pages to show posting/deadline dates.
 */

/**
 * Formats an ISO date string (or any value `Date` can parse) into an
 * India-locale absolute date, e.g. "18 Aug 2026".
 *
 * @param {string|number|Date} dateStr - Date value parseable by `new Date()`.
 * @returns {string} Localized date string ("day month year", short month name).
 * Used by: JobDetail, TenderDetail, GovtJobDetail, Invoices (posted/deadline dates).
 */
export function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

/**
 * Formats an ISO date string into a coarse relative "time ago" label.
 * Buckets: same calendar day-of-diff -> "Today"/"Yesterday"; under 30 days
 * -> "N days ago"; under 365 days -> whole months; otherwise whole years.
 *
 * Note: day/month/year boundaries are computed from a fixed 86,400,000ms
 * (24h) divisor on the raw millisecond difference, not calendar-aware —
 * this is an approximation (doesn't account for DST or exact month
 * lengths) but is precise enough for "posted X ago" style UI copy.
 *
 * @param {string|number|Date} dateStr - Date value parseable by `new Date()`.
 * @returns {string} Relative time label, e.g. "3 days ago", "2 months ago".
 * Used by: Jobs/Tenders/GovtJobs listing cards to show recency at a glance.
 */
export function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr)
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days} days ago`
  if (days < 365) return `${Math.floor(days / 30)} months ago`
  return `${Math.floor(days / 365)} years ago`
}
