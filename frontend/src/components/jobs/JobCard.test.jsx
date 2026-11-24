/**
 * JobCard.test.jsx — private-job links stay inside the student dashboard:
 * job cards, Saved Jobs' "Browse Jobs" and the dashboard sidebar's Jobs item
 * point at /seeker/browse-jobs there, and at /jobs on the public site.
 */
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/services/seekerService', () => ({
  seekerService: { savedJobs: vi.fn(() => Promise.resolve({ data: [] })) },
}))

import { JobCard } from './JobCard'
import SavedJobs from '@/pages/seeker/SavedJobs'
import SeekerLayout from '@/components/layout/SeekerLayout'
import { useAuthStore } from '@/store/authStore'

const JOB = { id: 7, title: 'React Developer', company_name: 'Acme', city: 'Pune', job_type: 'full_time', created_at: '2026-11-20T00:00:00Z' }

function renderAt(url, path, element) {
  return render(<MemoryRouter initialEntries={[url]}><Routes><Route path={path} element={element} /></Routes></MemoryRouter>)
}

describe('job links by layout', () => {
  it('JobCard links to /jobs/:id publicly and /seeker/browse-jobs/:id in the dashboard', () => {
    const { unmount } = renderAt('/jobs', '/jobs', <JobCard job={JOB} />)
    expect(screen.getByRole('link', { name: /React Developer/ })).toHaveAttribute('href', '/jobs/7')
    unmount()
    renderAt('/seeker/browse-jobs', '/seeker/browse-jobs', <JobCard job={JOB} />)
    expect(screen.getByRole('link', { name: /React Developer/ })).toHaveAttribute('href', '/seeker/browse-jobs/7')
  })

  it("Saved Jobs' Browse Jobs stays inside the dashboard", async () => {
    renderAt('/seeker/saved', '/seeker/saved', <SavedJobs />)
    expect(await screen.findByRole('link', { name: /Browse Jobs/ })).toHaveAttribute('href', '/seeker/browse-jobs')
  })

  it('the student sidebar has a Jobs item', () => {
    useAuthStore.setState({ token: 'jwt', user: { is_job_seeker: true, email: 's@example.com' } })
    renderAt('/seeker', '/seeker', <SeekerLayout />)
    expect(screen.getByRole('link', { name: 'Jobs' })).toHaveAttribute('href', '/seeker/browse-jobs')
  })
})
