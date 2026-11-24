/** deadline.test.js — closing-date labels and urgency levels. */
import { describe, expect, it } from 'vitest'
import { deadlineInfo } from './deadline'

const now = new Date(2026, 10, 24, 10, 0) // 24 Nov 2026, 10:00 local

describe('deadlineInfo', () => {
  it('labels relative deadlines with urgency', () => {
    expect(deadlineInfo(new Date(2026, 10, 24, 23, 59).toISOString(), now)).toEqual({ label: 'Closes today', urgency: 'today' })
    expect(deadlineInfo(new Date(2026, 10, 25, 17, 0).toISOString(), now)).toEqual({ label: 'Closes tomorrow', urgency: 'soon' })
    expect(deadlineInfo(new Date(2026, 10, 27, 9, 0).toISOString(), now)).toEqual({ label: 'Closes in 3 days', urgency: 'soon' })
    expect(deadlineInfo(new Date(2026, 10, 30, 9, 0).toISOString(), now)).toEqual({ label: 'Closes in 6 days', urgency: 'later' })
    expect(deadlineInfo(new Date(2026, 11, 20, 9, 0).toISOString(), now).label).toMatch(/^Closes \d/)
  })

  it('handles past and missing deadlines', () => {
    expect(deadlineInfo(new Date(2026, 10, 24, 9, 0).toISOString(), now)).toEqual({ label: 'Closed', urgency: 'closed' })
    expect(deadlineInfo(null, now)).toBeNull()
    expect(deadlineInfo('not a date', now)).toBeNull()
  })
})
