// RNTL v14: render/fireEvent are async and must be awaited.
// Saving tenders and tender alerts on mobile: bookmarks on the Tenders list and
// the tender screen (whose portal link now works), the Saved Tenders screen,
// contractors' Tender Alerts (keyword suggestions, pause/delete, matching
// tenders), and the contractor dashboard on the Home tab. Services are mocked.
import React from 'react';
import { Linking } from 'react-native';
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

const mockRoad = { id: 7, title: 'Road construction Sector 12', organisation: 'PWD B&R Karnal', state: 'Haryana', category: 'works',
  submission_deadline: new Date(Date.now() + 5 * 86400000).toISOString(), source_url: 'https://etenders.hry.nic.in/nicgep/app' };
const mockDrain = { ...mockRoad, id: 8, title: 'Storm water drain cleaning', state: 'Punjab' };

jest.mock('@/services/tenderService', () => ({
  ...jest.requireActual('@/services/tenderService'),
  tenderService: {
    list: jest.fn(() => Promise.resolve({ data: { results: [mockRoad] } })),
    states: jest.fn(() => Promise.resolve({ data: [] })),
    get: jest.fn(() => Promise.resolve({ data: mockRoad })),
    alerts: jest.fn(),
    createAlert: jest.fn(),
    updateAlert: jest.fn(() => Promise.resolve({})),
    deleteAlert: jest.fn(() => Promise.resolve({})),
    alertMatches: jest.fn(() => Promise.resolve({ data: { count: 1, results: [mockRoad] } })),
    allAlertMatches: jest.fn(() => Promise.resolve({ data: { count: 1, results: [mockRoad] } })),
    keywordSuggestions: jest.fn(() => Promise.resolve({ data: [{ keyword: 'Road construction', count: 12 }, { keyword: 'Road repair', count: 5 }] })),
    saved: jest.fn(),
    save: jest.fn(() => Promise.resolve({ data: { id: 91 } })),
    unsave: jest.fn(() => Promise.resolve({})),
    stats: jest.fn(() => Promise.resolve({ data: { saved_tenders: 2, active_alerts: 1, alert_matches: 14, new_today: 37, open_tenders: 412 } })),
  },
}));
jest.mock('@/services/govtJobService', () => ({ govtJobService: { alerts: jest.fn(() => Promise.resolve({ data: [] })) } }));
jest.mock('@/services/seekerService', () => ({
  ...jest.requireActual('@/services/seekerService'),
  seekerService: { alerts: jest.fn(() => Promise.resolve({ data: [] })), savedJobs: jest.fn(() => Promise.resolve({ data: [] })) },
}));

import { TenderAlertsSection } from './TenderAlertsSection';
import { tenderMatchSummary } from './TenderMatchesList';
import { AlertsScreen } from '@/screens/seeker/AlertsScreen';
import { SavedTendersScreen } from '@/screens/seeker/SavedTendersScreen';
import { TendersScreen } from '@/screens/tenders/TendersScreen';
import { TenderDetailScreen } from '@/screens/tenders/TenderDetailScreen';
import { ContractorSummary } from '@/components/home/ContractorSummary';
import { tenderService } from '@/services/tenderService';
import { useAuthStore } from '@/store/authStore';
import { useSavedTendersStore } from '@/store/savedTendersStore';

const svc = tenderService as unknown as Record<string, jest.Mock>;
const contractor = { id: 1, email: 'firm@example.com', username: 'firm', is_company: false, is_job_seeker: false, is_contractor: true };
let tokenN = 0;

beforeEach(() => {
  jest.clearAllMocks();
  useSavedTendersStore.getState().clear();
  useAuthStore.setState({ token: `jwt-${++tokenN}`, user: contractor });
  svc.saved.mockResolvedValue({ data: [] });
  svc.alerts.mockResolvedValue({ data: [{ id: 3, keyword: 'road', state: '', category: '', min_value: null, is_active: true }] });
});

describe('saving tenders', () => {
  it('saves from a Tenders list card', async () => {
    await render(<TendersScreen navigation={{ navigate: jest.fn() }} />);
    await fireEvent.press(await screen.findByLabelText('Save tender'));
    expect(svc.save).toHaveBeenCalledWith(7);
    expect(await screen.findByLabelText('Remove from saved')).toBeTruthy();
  });

  it('saves from the tender screen, whose portal button opens source_url', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await render(<TenderDetailScreen route={{ params: { tenderId: 7 } }} />);
    await fireEvent.press(await screen.findByText('View on Portal →'));
    expect(openURL).toHaveBeenCalledWith('https://etenders.hry.nic.in/nicgep/app');
    await fireEvent.press(screen.getByText('Save tender'));
    expect(svc.save).toHaveBeenCalledWith(7);
    expect(await screen.findByText('Saved ✓')).toBeTruthy();
    openURL.mockRestore();
  });

  it('lists saved tenders, marks closed ones and removes one', async () => {
    svc.saved.mockResolvedValue({ data: [
      { id: 1, tender: 7, saved_at: '', is_open: true, details: mockRoad },
      { id: 2, tender: 8, saved_at: '', is_open: false, details: mockDrain },
    ] });
    const navigation = { navigate: jest.fn() };
    await render(<SavedTendersScreen navigation={navigation} />);
    expect(await screen.findByText('2 saved tenders')).toBeTruthy();
    expect(screen.getByText('Closed')).toBeTruthy();
    await fireEvent.press(screen.getByText('Road construction Sector 12'));
    expect(navigation.navigate).toHaveBeenCalledWith('App', { screen: 'Tenders', params: { screen: 'TenderDetail', params: { tenderId: 7 } } });
    await fireEvent.press(screen.getAllByLabelText('Remove from saved')[0]);
    expect(svc.unsave).toHaveBeenCalledWith(1);
    await waitFor(() => expect(screen.queryByText('Road construction Sector 12')).toBeNull());
  });
});

describe('tender alerts', () => {
  it('summarises matches like the web', () => {
    expect(tenderMatchSummary(14)).toBe('14 open tenders match');
    expect(tenderMatchSummary(0)).toBe('No open tenders match yet');
  });

  it('shows each alert with its matching tenders, which can be saved', async () => {
    await render(<TenderAlertsSection navigation={{ navigate: jest.fn() }} />);
    expect(await screen.findByText('"road"')).toBeTruthy();
    await fireEvent.press(await screen.findByText('1 open tender match'));
    expect(svc.alertMatches).toHaveBeenCalledWith(3, { limit: 20 });
    await fireEvent.press(screen.getByLabelText('Save tender'));
    expect(svc.save).toHaveBeenCalledWith(7);
  });

  it('creates an alert from a suggested keyword', async () => {
    svc.createAlert.mockResolvedValue({ data: { id: 4, keyword: 'Road repair', state: 'Haryana', category: '', min_value: null, is_active: true } });
    await render(<TenderAlertsSection navigation={{ navigate: jest.fn() }} />);
    await fireEvent.press(await screen.findByText('New tender alert'));
    await fireEvent.changeText(screen.getByPlaceholderText('e.g. road construction'), 'road');
    await fireEvent.press(await screen.findByLabelText('Use Road repair, 5 tenders'));
    expect(svc.keywordSuggestions).toHaveBeenLastCalledWith('road');
    await fireEvent.changeText(screen.getByPlaceholderText('e.g. Haryana'), 'Haryana');
    await fireEvent.press(screen.getByText('Create tender alert'));
    expect(svc.createAlert).toHaveBeenCalledWith({ keyword: 'Road repair', state: 'Haryana', is_active: true });
    expect(await screen.findByText('"Road repair"')).toBeTruthy();
  });

  it('pauses and deletes an alert', async () => {
    await render(<TenderAlertsSection navigation={{ navigate: jest.fn() }} />);
    await fireEvent(await screen.findByLabelText('Pause tender alert'), 'valueChange', false);
    expect(svc.updateAlert).toHaveBeenCalledWith(3, { is_active: false });
    expect(await screen.findByText('○ Paused')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Delete tender alert'));
    await waitFor(() => expect(screen.queryByText('"road"')).toBeNull());
  });

  it('is on the Alerts screen for contractors, without repeating tender alerts in the read-only list', async () => {
    await render(<AlertsScreen navigation={{ navigate: jest.fn() }} />);
    expect(await screen.findByText('Tender Alerts')).toBeTruthy();
    expect(screen.queryByText('Tender & Govt Job Alerts')).toBeNull();
    expect(screen.queryByText('Job Alerts')).toBeNull(); // job alerts are for job seekers
  });
});

describe('contractor dashboard on Home', () => {
  it('shows the counts, opens each screen, and previews matching tenders', async () => {
    await render(<ContractorSummary />);
    expect(await screen.findByLabelText('New Today: 37')).toBeTruthy();
    expect(screen.getByText('412 open in all')).toBeTruthy();
    expect(screen.getByText('14 matching')).toBeTruthy();
    expect(await screen.findByText('Road construction Sector 12')).toBeTruthy();
    expect(svc.allAlertMatches).toHaveBeenCalledWith({ limit: 3 });
    await fireEvent.press(screen.getByLabelText('Saved Tenders: 2'));
    expect(mockNavigate).toHaveBeenCalledWith('SavedTenders');
    await fireEvent.press(screen.getByLabelText('New Today: 37'));
    expect(mockNavigate).toHaveBeenCalledWith('Tenders', { screen: 'TendersList' });
  });

  it('renders nothing for job seekers', async () => {
    useAuthStore.setState({ token: 'jwt', user: { ...contractor, is_contractor: false, is_job_seeker: true } });
    const { toJSON } = await render(<ContractorSummary />);
    expect(toJSON()).toBeNull();
    expect(svc.stats).not.toHaveBeenCalled();
  });
});
