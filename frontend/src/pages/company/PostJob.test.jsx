/**
 * PostJob.test.jsx — the job-posting pages are shared by the company dashboard
 * (/dashboard/...) and the contractor dashboard (/seeker/...); links and the
 * post-submit redirect must stay inside whichever dashboard the user is in.
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/services/jobService', () => ({
  jobService: {
    create: vi.fn(() => Promise.resolve({ data: { id: 1 } })),
    myJobs: vi.fn(() => Promise.resolve({ data: [] })),
  },
}))

import PostJob from './PostJob'
import ManageJobs from './ManageJobs'

describe('job posting inside the contractor dashboard', () => {
  it('returns to /seeker/jobs after posting', async () => {
    render(
      <MemoryRouter initialEntries={['/seeker/post-job']}>
        <Routes>
          <Route path="/seeker/post-job" element={<PostJob />} />
          <Route path="/seeker/jobs" element={<p>contractor jobs list</p>} />
          <Route path="/dashboard/jobs" element={<p>company jobs list</p>} />
        </Routes>
      </MemoryRouter>,
    )
    // The form's <label>s aren't tied to their inputs, so fields are found by name.
    const field = (name) => document.querySelector(`[name="${name}"]`)
    await userEvent.type(field('title'), 'Site Engineer (Civil)')
    await userEvent.type(field('description'), 'Supervise road and drainage works for municipal contracts.')
    await userEvent.type(field('location'), 'Sector 9')
    await userEvent.type(field('city'), 'Karnal')
    await userEvent.selectOptions(field('job_type'), 'full_time')
    await userEvent.type(field('redirect_url'), 'https://acme-infra.example/careers')
    await userEvent.click(screen.getByRole('button', { name: /post job/i }))
    expect(await screen.findByText('contractor jobs list')).toBeInTheDocument()
  })

  it("Manage Jobs' post link stays in the contractor dashboard", async () => {
    render(
      <MemoryRouter initialEntries={['/seeker/jobs']}>
        <Routes><Route path="/seeker/jobs" element={<ManageJobs />} /></Routes>
      </MemoryRouter>,
    )
    const links = await screen.findAllByRole('link')
    expect(links.map(l => l.getAttribute('href'))).toContain('/seeker/post-job')
    expect(links.map(l => l.getAttribute('href'))).not.toContain('/dashboard/post-job')
  })
})
