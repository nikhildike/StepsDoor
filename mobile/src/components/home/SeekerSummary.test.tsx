// RNTL v14: render/fireEvent are async and must be awaited.
// The job seeker dashboard on the Home tab: stat cards with real counts that
// open their screens, the newest jobs matching the seeker's alerts, the prompt
// when they have no alerts, and nothing at all for guests and contractors.
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const React = jest.requireActual('react');
  return {
    ...jest.requireActual('@react-navigation/native'),
    useNavigation: () => ({ navigate: mockNavigate }),
    useFocusEffect: (effect: () => void) => React.useEffect(effect, [effect]),
  };
});

const STATS = { saved_jobs: 4, active_alerts: 2, alert_matches: 1230, new_jobs_today: { total: 120, job: 0, company: 110, govt: 10 } };

jest.mock('@/services/seekerService', () => ({
  ...jest.requireActual('@/services/seekerService'),
  seekerService: {
    stats: jest.fn(),
    allAlertMatches: jest.fn(() => Promise.resolve({ data: {
      count: 1, counts: { company: 1 },
      results: [{ kind: 'company', id: 7, title: 'Senior React Developer', company: 'Razorpay', location: 'Bengaluru',
        apply_url: 'https://boards.greenhouse.io/razorpay/jobs/7', posted_at: null, deadline: null }],
    } })),
    savedJobs: jest.fn(() => Promise.resolve({ data: [] })),
  },
}));

import { SeekerSummary, todayNote } from './SeekerSummary';
import { seekerService } from '@/services/seekerService';
import { useAuthStore } from '@/store/authStore';

const svc = seekerService as unknown as Record<string, jest.Mock>;
const seekerUser = { id: 1, email: 'a@b.c', username: 'asha', is_company: false, is_job_seeker: true, is_contractor: false };

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({ token: 'jwt', user: seekerUser });
  svc.stats.mockResolvedValue({ data: STATS });
});

describe('SeekerSummary', () => {
  it('shows the counts and opens each card\'s screen', async () => {
    await render(<SeekerSummary />);
    expect(await screen.findByLabelText('Saved Jobs: 4')).toBeTruthy();
    expect(screen.getByText('1,230 matching jobs')).toBeTruthy();
    expect(screen.getByLabelText('New Jobs Today: 120')).toBeTruthy();
    expect(screen.getByText('110 company · 10 govt')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Saved Jobs: 4'));
    expect(mockNavigate).toHaveBeenCalledWith('SavedJobs');
    await fireEvent.press(screen.getByLabelText('Active Alerts: 2'));
    expect(mockNavigate).toHaveBeenCalledWith('Alerts');
    await fireEvent.press(screen.getByLabelText('New Jobs Today: 120'));
    expect(mockNavigate).toHaveBeenCalledWith('Jobs', { screen: 'Home' });
  });

  it('previews the newest jobs matching the alerts', async () => {
    await render(<SeekerSummary />);
    expect(await screen.findByText('Senior React Developer')).toBeTruthy();
    expect(svc.allAlertMatches).toHaveBeenCalledWith({ limit: 3 });
    expect(screen.getByLabelText('Save job')).toBeTruthy();
  });

  it('prompts to create an alert when there are none, without fetching matches', async () => {
    svc.stats.mockResolvedValue({ data: { ...STATS, active_alerts: 0, alert_matches: 0 } });
    await render(<SeekerSummary />);
    expect(await screen.findByText('Create alert')).toBeTruthy();
    expect(screen.getByText('Save a keyword')).toBeTruthy();
    await waitFor(() => expect(svc.stats).toHaveBeenCalled());
    expect(svc.allAlertMatches).not.toHaveBeenCalled();
  });

  it('renders nothing for guests and contractors', async () => {
    useAuthStore.setState({ token: null, user: null });
    const guest = await render(<SeekerSummary />);
    expect(guest.toJSON()).toBeNull();
    useAuthStore.setState({ token: 'jwt', user: { ...seekerUser, is_contractor: true } });
    await screen.rerender(<SeekerSummary />);
    expect(screen.toJSON()).toBeNull();
    expect(svc.stats).not.toHaveBeenCalled();
  });
});

describe('todayNote', () => {
  it('breaks the count down by source', () => {
    expect(todayNote({ total: 0, job: 0, company: 0, govt: 0 })).toBe('Since midnight');
    expect(todayNote({ total: 3, job: 1, company: 2, govt: 0 })).toBe('2 company · 1 StepsDoor');
  });
});
