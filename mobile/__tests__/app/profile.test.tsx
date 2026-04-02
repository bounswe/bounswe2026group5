import React from 'react';
import { render } from '@testing-library/react-native';
import ProfileScreen from '@/app/(tabs)/profile';

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'View' }));

// We must mock expo-router because the Settings icon uses router.push()
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

describe('ProfileScreen Layout', () => {
  it('renders the user profile data and section headers', () => {
    const { getByText } = render(<ProfileScreen />);

    // Check page header
    expect(getByText('Profile')).toBeTruthy();

    // Check that the mock user data rendered
    expect(getByText('Ali Aydın')).toBeTruthy();
    
    // Check that the main sections rendered
    expect(getByText('Expertise')).toBeTruthy();
    expect(getByText('Learning Goals')).toBeTruthy();
  });
});