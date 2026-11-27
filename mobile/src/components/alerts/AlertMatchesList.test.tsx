// RNTL v14: render/fireEvent are async and must be awaited.
// Saved jobs and job alerts across every kind of job on mobile: the shared
// saved-jobs store, the alert matches list, AlertsScreen's job alerts, and
// SavedJobsScreen. No real network: services are mocked.
import React from 'react';
import { Linking } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

jest.mock('@react-navigation/native', () => {
  const React = jest.requireActual('react');
  return {
    ...jest.requireActual('@react-navigation/native'),
    useNavigation: () => ({ navigate: jest.fn() }),
    // Run the focus effect once, like a screen that has just been shown.
    useFocusEffect: (effect: () => void) => React.useEffect(effect, [effect]),
  };
});

const MATCHES = {
  count: 3,
  counts: { job: 1, company: 1, govt: 1 },
  results: [
    { kind: 'company', id: 7, title: 'Senior React Developer', company: 'Razorpay', location: 'Bengaluru',
      apply_url: 'https://boards.greenhouse.io/razorpay/jobs/7', posted_at: null, deadline: null },
    { kind: 'govt', id: 3, title: 'Junior Developer (React)', company: 'UPSC', location: 'Central Govt',
      apply_url: 'https://upsc.gov.in/a.pdf', posted_at: null, deadline: null },
    { kind: 'job', id: 12, title: 'React Developer', company: 'Nimbus Labs', location: 'Bengaluru',
      apply_url: 'https://nimbus.example/careers', posted_at: null, deadline: null },
  ],
};

jest.mock('@/services/seekerService', () => ({
  ...jest.requireActual('@/services/seekerService'),
  seekerService: {
    savedJobs: jest.fn(),
    saveJob: jest.fn(() => Promise.resolve({ data: { id: 99 } })),
    unsaveJob: jest.fn(() => Promise.resolve({})),
    alerts: jest.fn(),
    createAlert: jest.fn(),
    updateAlert: jest.fn(() => Promise.resolve({})),
    deleteAlert: jest.fn(() => Promise.resolve({})),
    alertMatches: jest.fn(() => Promise.resolve({ data: MATCHES })),
    keywordSuggestions: jest.fn(() => Promise.resolve({ data: [
      { keyword: 'Data Engineer', count: 66 }, { keyword: 'Data Analyst', count: 9 },
    ] })),
  },
}));
jest.mock('@/services/tenderService', () => ({
  tenderService: { alerts: jest.fn(() => Promise.resolve({ data: [{ id: 1, keyword: 'road', state: 'Haryana' }] })) },
}));
jest.mock('@/services/govtJobService', () => ({
  govtJobService: { alerts: jest.fn(() => Promise.resolve({ data: [] })) },
}));
jest.mock('@/services/jobService', () => ({
  jobService: { trackClick: jest.fn(() => Promise.resolve({ data: { redirect_url: 'https://nimbus.example/apply' } })) },
}));

import { AlertMatchesList, matchSummary } from './AlertMatchesList';
import { AlertsScreen } from '@/screens/seeker/AlertsScreen';
import { SavedJobsScreen } from '@/screens/seeker/SavedJobsScreen';
import { seekerService } from '@/services/seekerService';
import { useAuthStore } from '@/store/authStore';
import { useSavedJobsStore } from '@/store/savedJobsStore';

const svc = seekerService as unknown as Record<string, jest.Mock>;
let tokenN = 0;

beforeEach(() => {
  jest.clearAllMocks();
  useSavedJobsStore.getState().clear();
  // A fresh token per test, so the store loads the saved list again.
  useAuthStore.setState({ token: `jwt-${++tokenN}`, user: null });
  svc.savedJobs.mockResolvedValue({ data: [{ id: 40, kind: 'govt', govt_job: 3, job_post: null, career_job: null }] });
  svc.alerts.mockResolvedValue({ data: [{ id: 5, role_keyword: 'react developer', city: '', job_type: '', salary_min: null, is_active: true }] });
});

describe('matchSummary', () => {
  it('uses the same wording as the web', () => {
    expect(matchSummary(MATCHES)).toBe('3 open jobs match: 1 on StepsDoor, 1 from company careers pages, 1 government');
    expect(matchSummary({ count: 0, counts: {} })).toBe('No open jobs match yet');
  });
});

describe('AlertMatchesList', () => {
  it('starts collapsed, expands into the jobs, and shows what is already saved', async () => {
    await render(<AlertMatchesList alertId={5} navigation={{ navigate: jest.fn() }} />);
    const summary = await screen.findByText(/3 open jobs match/);
    expect(screen.queryByText('Senior React Developer')).toBeNull();
    await fireEvent.press(summary);
    expect(screen.getByText('Senior React Developer')).toBeTruthy();
    await waitFor(() => expect(screen.getAllByLabelText('Remove from saved')).toHaveLength(1)); // the govt job
    expect(screen.getAllByLabelText('Save job')).toHaveLength(2);
  });

  it('saves with the job kind, and opens jobs in the right place', async () => {
    const navigation = { navigate: jest.fn() };
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await render(<AlertMatchesList alertId={5} navigation={navigation} />);
    await fireEvent.press(await screen.findByText(/3 open jobs match/));
    await waitFor(() => expect(screen.getAllByLabelText('Save job')).toHaveLength(2));

    await fireEvent.press(screen.getAllByLabelText('Save job')[0]);
    expect(svc.saveJob).toHaveBeenCalledWith(7, 'company');

    await fireEvent.press(screen.getByText('React Developer'));
    expect(navigation.navigate).toHaveBeenCalledWith('App', { screen: 'Jobs', params: { screen: 'JobDetail', params: { jobId: 12 } } });
    await fireEvent.press(screen.getByText('Senior React Developer'));
    expect(openURL).toHaveBeenCalledWith('https://boards.greenhouse.io/razorpay/jobs/7');
    openURL.mockRestore();
  });
});

describe('AlertsScreen', () => {
  it('lists job alerts with their matches, plus tender alerts', async () => {
    await render(<AlertsScreen navigation={{ navigate: jest.fn() }} />);
    expect(await screen.findByText('"react developer"')).toBeTruthy();
    expect(await screen.findByText(/3 open jobs match/)).toBeTruthy();
    expect(screen.getByText('Keyword: road')).toBeTruthy(); // tender alert field is `keyword`
  });

  it('creates a job alert from a keyword and city', async () => {
    svc.createAlert.mockResolvedValue({ data: { id: 6, role_keyword: 'data analyst', city: 'Pune', job_type: '', salary_min: null, is_active: true } });
    await render(<AlertsScreen navigation={{ navigate: jest.fn() }} />);
    await fireEvent.press(await screen.findByText('New alert'));
    await fireEvent.changeText(screen.getByPlaceholderText('e.g. Data Analyst'), ' data analyst ');
    await fireEvent.changeText(screen.getByPlaceholderText('e.g. Bangalore'), 'Pune');
    await fireEvent.press(screen.getByText('Create alert'));
    expect(svc.createAlert).toHaveBeenCalledWith({ role_keyword: 'data analyst', city: 'Pune', is_active: true });
    expect(await screen.findByText('"data analyst"')).toBeTruthy();
  });

  it('suggests keywords while typing; tapping one fills the field and is saved', async () => {
    svc.createAlert.mockResolvedValue({ data: { id: 7, role_keyword: 'Data Engineer', city: '', job_type: '', salary_min: null, is_active: true } });
    await render(<AlertsScreen navigation={{ navigate: jest.fn() }} />);
    await fireEvent.press(await screen.findByText('New alert'));
    await fireEvent.changeText(screen.getByPlaceholderText('e.g. Data Analyst'), 'data');
    const suggestion = await screen.findByLabelText('Use Data Engineer, 66 jobs');
    expect(svc.keywordSuggestions).toHaveBeenLastCalledWith('data');
    await fireEvent.press(suggestion);
    expect(screen.getByPlaceholderText('e.g. Data Analyst').props.value).toBe('Data Engineer');
    expect(screen.queryByLabelText('Use Data Analyst, 9 jobs')).toBeNull(); // list hidden after picking
    await fireEvent.press(screen.getByText('Create alert'));
    expect(svc.createAlert).toHaveBeenCalledWith({ role_keyword: 'Data Engineer', city: '', is_active: true });
  });

  it('needs a keyword or city, and can pause and delete an alert', async () => {
    await render(<AlertsScreen navigation={{ navigate: jest.fn() }} />);
    await fireEvent.press(await screen.findByText('New alert'));
    await fireEvent.press(screen.getByText('Create alert'));
    expect(screen.getByText('Enter a keyword or a city.')).toBeTruthy();
    expect(svc.createAlert).not.toHaveBeenCalled();

    await fireEvent(screen.getByLabelText('Pause alert'), 'valueChange', false);
    expect(svc.updateAlert).toHaveBeenCalledWith(5, { is_active: false });
    expect(await screen.findByText('○ Paused')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Delete alert'));
    await waitFor(() => expect(screen.queryByText('"react developer"')).toBeNull());
  });

  it('asks guests to sign in', async () => {
    useAuthStore.setState({ token: null, user: null });
    await render(<AlertsScreen navigation={{ navigate: jest.fn() }} />);
    expect(screen.getByText('Free for members')).toBeTruthy();
    expect(svc.alerts).not.toHaveBeenCalled();
  });
});

describe('SavedJobsScreen', () => {
  const SAVED = [
    { id: 1, kind: 'company', career_job: 7, job_post: null, govt_job: null, job_title: 'Senior React Developer',
      company_name: 'Razorpay', city: 'Bengaluru', redirect_url: 'https://boards.greenhouse.io/razorpay/jobs/7',
      is_open: true, deadline: null, job_type: null },
    { id: 2, kind: 'govt', govt_job: 3, job_post: null, career_job: null, job_title: 'Junior Developer (React)',
      company_name: 'UPSC', city: 'Central Govt', redirect_url: 'https://upsc.gov.in/a.pdf',
      is_open: false, deadline: null, job_type: null },
    { id: 3, kind: 'job', job_post: 12, career_job: null, govt_job: null, job_title: 'React Developer',
      company_name: 'Nimbus Labs', city: 'Bengaluru', redirect_url: 'https://nimbus.example/careers',
      is_open: true, deadline: null, job_type: 'full_time' },
  ];

  beforeEach(() => svc.savedJobs.mockResolvedValue({ data: SAVED }));

  it('lists every kind, marks closed jobs, and applies the right way per kind', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await render(<SavedJobsScreen navigation={{ navigate: jest.fn() }} />);
    expect(await screen.findByText('Senior React Developer')).toBeTruthy();
    expect(screen.getByText('3 saved jobs')).toBeTruthy();
    expect(screen.getByText('Company careers page')).toBeTruthy();
    expect(screen.getByText('Government job')).toBeTruthy();
    expect(screen.getByText('Closed')).toBeTruthy();
    const applies = screen.getAllByText('Apply');
    expect(applies).toHaveLength(2); // not for the closed govt job

    await fireEvent.press(applies[0]); // company job: opens directly
    expect(openURL).toHaveBeenCalledWith('https://boards.greenhouse.io/razorpay/jobs/7');
    await fireEvent.press(applies[1]); // StepsDoor post: tracked, then opens the returned URL
    await waitFor(() => expect(openURL).toHaveBeenCalledWith('https://nimbus.example/apply'));
    openURL.mockRestore();
  });

  it('removes a job through the shared store', async () => {
    await render(<SavedJobsScreen navigation={{ navigate: jest.fn() }} />);
    await fireEvent.press(await screen.findByLabelText('Remove Senior React Developer from saved'));
    expect(svc.unsaveJob).toHaveBeenCalledWith(1);
    await waitFor(() => expect(screen.queryByText('Senior React Developer')).toBeNull());
    expect(useSavedJobsStore.getState().saved['company:7']).toBeUndefined();
    expect(useSavedJobsStore.getState().saved['job:12']).toBe(3);
  });
});
