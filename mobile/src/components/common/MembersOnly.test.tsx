// RNTL v14: render/fireEvent are async and must be awaited.
// Members-only gating: the sign-in prompt's navigation, and that guests never
// request scraped tenders (the API would 401 them).
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));
jest.mock('@/services/tenderService', () => ({
  tenderService: {
    list: jest.fn(() => Promise.resolve({ data: { results: [] } })),
    states: jest.fn(() => Promise.resolve({ data: [] })),
    saved: jest.fn(() => Promise.resolve({ data: [] })),
  },
}));

import { MembersOnly } from './MembersOnly';
import { TendersScreen } from '@/screens/tenders/TendersScreen';
import { tenderService } from '@/services/tenderService';
import { useAuthStore } from '@/store/authStore';

describe('MembersOnly', () => {
  beforeEach(() => mockNavigate.mockClear());

  it('opens the Auth stack on Sign In, and Register on the secondary link', async () => {
    await render(<MembersOnly what="the latest government tenders" />);
    expect(screen.getByText(/Sign in to see the latest government tenders/)).toBeTruthy();

    await fireEvent.press(screen.getByText('Sign In'));
    expect(mockNavigate).toHaveBeenCalledWith('Auth');

    await fireEvent.press(screen.getByText('Create free account'));
    expect(mockNavigate).toHaveBeenCalledWith('Auth', { screen: 'Register' });
  });
});

describe('TendersScreen members-only gating', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows the prompt to guests without calling the API', async () => {
    useAuthStore.setState({ token: null, user: null });
    await render(<TendersScreen navigation={{ navigate: jest.fn() }} />);
    expect(screen.getByText('Free for members')).toBeTruthy();
    expect(tenderService.list).not.toHaveBeenCalled();
    expect(tenderService.states).not.toHaveBeenCalled();
  });

  it('loads tenders once signed in', async () => {
    useAuthStore.setState({ token: 'jwt', user: null });
    await render(<TendersScreen navigation={{ navigate: jest.fn() }} />);
    await waitFor(() => expect(tenderService.list).toHaveBeenCalled());
    expect(tenderService.states).toHaveBeenCalled();
    expect(screen.queryByText('Free for members')).toBeNull();
  });
});
