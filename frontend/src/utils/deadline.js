/**
 * deadline.js — human-friendly closing-date labels for listings.
 *
 * Used by the Latest tenders / Latest govt jobs lists and the seeker dashboard
 * to show "Closes today", "Closes in 3 days" or "Closes 12 Dec 2026", with an
 * urgency level the UI colours by. Days are counted in the viewer's local
 * calendar (IST for Indian users), so a deadline of 23:59 tonight is "today".
 */
import { formatDate } from '@/utils/formatDate'

const DAY_MS = 24 * 60 * 60 * 1000

// Midnight (local time) at the start of the given date.
function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/**
 * Describes a closing date relative to `now`.
 *
 * @param {string|null} isoDate - deadline from the API (ISO string) or null/undefined.
 * @param {Date} [now] - injectable for tests.
 * @returns {{label: string, urgency: 'closed'|'today'|'soon'|'later'}|null}
 *   null when there's no deadline. 'soon' means within 3 days.
 */
export function deadlineInfo(isoDate, now = new Date()) {
  if (!isoDate) return null
  const deadline = new Date(isoDate)
  if (Number.isNaN(deadline.getTime())) return null
  if (deadline < now) return { label: 'Closed', urgency: 'closed' }
  const days = Math.round((startOfDay(deadline) - startOfDay(now)) / DAY_MS)
  if (days === 0) return { label: 'Closes today', urgency: 'today' }
  if (days === 1) return { label: 'Closes tomorrow', urgency: 'soon' }
  if (days <= 3) return { label: `Closes in ${days} days`, urgency: 'soon' }
  if (days <= 7) return { label: `Closes in ${days} days`, urgency: 'later' }
  return { label: `Closes ${formatDate(isoDate)}`, urgency: 'later' }
}

// Tailwind classes for a deadline badge at each urgency.
export const DEADLINE_BADGE = {
  closed: 'bg-muted text-muted-foreground',
  today: 'bg-red-100 text-red-700',
  soon: 'bg-amber-100 text-amber-800',
  later: 'bg-muted text-muted-foreground',
}
