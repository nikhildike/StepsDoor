/**
 * JobsLayout.test.jsx — the Jobs hub (Jobs / Companies / Govt Jobs / Freelancing)
 * on the public site and inside the student dashboard, and the dashboard
 * sidebar keeping "Jobs" highlighted across the hub's tabs and detail pages.
 */
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import JobsLayout from './JobsLayout'
import SeekerLayout from './SeekerLayout'
import { useAuthStore } from '@/store/authStore'

function tabHrefs(url) {
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes><Route path="*" element={<JobsLayout />} /></Routes>
    </MemoryRouter>,
  )
  return Object.fromEntries(screen.getAllByRole('link').map(a => [a.textContent, a.getAttribute('href')]))
}

describe('Jobs hub tabs', () => {
  it('point at the public pages on the public site', () => {
    expect(tabHrefs('/jobs')).toEqual({
      Jobs: '/jobs', Companies: '/companies', 'Govt Jobs': '/govt-jobs', Freelancing: '/freelancers',
    })
  })

  it('point at the dashboard copies inside the student dashboard', () => {
    expect(tabHrefs('/seeker/browse-jobs')).toEqual({
      Jobs: '/seeker/browse-jobs', Companies: '/seeker/companies',
      'Govt Jobs': '/seeker/govt-jobs', Freelancing: '/seeker/freelancers',
    })
  })
})

describe('student sidebar', () => {
  it('highlights Jobs on every hub tab and detail page, with no separate Govt Jobs item', () => {
    useAuthStore.setState({ token: 'jwt', user: { is_job_seeker: true, email: 's@example.com' } })
    for (const url of ['/seeker/govt-jobs', '/seeker/companies', '/seeker/govt-jobs/8']) {
      const { unmount } = render(
        <MemoryRouter initialEntries={[url]}><Routes><Route path="/seeker/*" element={<SeekerLayout />} /></Routes></MemoryRouter>,
      )
      const nav = within(screen.getByRole('complementary'))
      expect(nav.getByRole('link', { name: 'Jobs' }).className).toContain('bg-primary')
      expect(nav.queryByRole('link', { name: 'Govt Jobs' })).toBeNull()
      unmount()
    }
  })
})
