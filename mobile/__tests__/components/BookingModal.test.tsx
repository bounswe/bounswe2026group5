import React from 'react';
import { render } from '@testing-library/react-native';
import { BookingModal } from '@/components/profile/BookingModal';

// Mock the icons to prevent font-loading warnings
jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return { Ionicons: 'View' };
});

describe('BookingModal Component', () => {
  const mockOffering = {
    id: '1',
    title: 'Advanced System Design',
    duration: '60 min',
    level: 'Senior',
    icon: 'server-outline',
    description: 'A deep dive into scalable architecture.'
  };

  const mockAvailability = [
    { day: 'Monday', times: ['10:00 - 12:00'] }
  ];

  it('renders the offering details when visible', () => {
    const { getByText, queryByText } = render(
      <BookingModal 
        visible={true} 
        onClose={jest.fn()} 
        offering={mockOffering as any} 
        availability={mockAvailability} 
      />
    );

    // Check if the modal title and offering title appear
    expect(getByText('Select Time')).toBeTruthy();    
    expect(getByText('Advanced System Design')).toBeTruthy();
    expect(getByText('60 min • Senior')).toBeTruthy();
  });

  it('does not render content when visible is false', () => {
    const { queryByText } = render(
      <BookingModal 
        visible={false} 
        onClose={jest.fn()} 
        offering={mockOffering as any} 
        availability={mockAvailability} 
      />
    );

    // The modal content should be hidden
    expect(queryByText('Request Session')).toBeNull();
  });
});