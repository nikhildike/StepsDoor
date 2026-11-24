/**
 * MembersOnly.test.jsx — the sign-in prompt shown instead of scraped listings,
 * and the round trip it starts: prompt → /login with `state.from` → useAuth
 * sends the user back to that page after signing in.
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { MembersOnly } from './MembersOnly'

// Stand-in for the Login page: shows where it was asked to return to.
function LoginProbe() {
  const location = useLocation()
  return <p>login, return to: {location.state?.from}</p>
}

describe('MembersOnly', () => {
  it('links to login and register carrying the current page as state.from', async () => {
    render(
      <MemoryRouter initialEntries={['/?tab=tenders']}>
        <Routes>
          <Route path="/" element={<MembersOnly what="the latest government tenders" />} />
          <Route path="/login" element={<LoginProbe />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText(/Sign in to see the latest government tenders/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create free account' })).toHaveAttribute('href', '/register')

    await userEvent.click(screen.getByRole('link', { name: 'Sign in' }))
    expect(screen.getByText('login, return to: /?tab=tenders')).toBeInTheDocument()
  })
})

describe('useAuth redirect after login', () => {
  it('returns to state.from instead of the role dashboard', async () => {
    vi.resetModules()
    vi.doMock('@/services/authService', () => ({
      authService: {
        login: vi.fn().mockResolvedValue({ data: { user: { is_job_seeker: true }, access: 'a', refresh: 'r' } }),
      },
    }))
    const { useAuth } = await import('@/hooks/useAuth')

    function LoginButton() {
      const { login } = useAuth()
      return <button onClick={() => login({ email: 'e', password: 'p' })}>log in</button>
    }

    render(
      <MemoryRouter initialEntries={[{ pathname: '/login', state: { from: '/tenders/42' } }]}>
        <Routes>
          <Route path="/login" element={<LoginButton />} />
          <Route path="/tenders/:id" element={<p>tender page</p>} />
          <Route path="/seeker" element={<p>seeker dashboard</p>} />
        </Routes>
      </MemoryRouter>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'log in' }))
    expect(await screen.findByText('tender page')).toBeInTheDocument()
  })
})
