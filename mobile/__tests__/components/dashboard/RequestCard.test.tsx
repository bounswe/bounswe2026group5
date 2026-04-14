import React from 'react';
import { render } from '@testing-library/react-native';
import { RequestCard } from '@/components/dashboard/RequestCard';

describe('RequestCard Component', () => {
  it('renders standard incoming request correctly', () => {
    const { getByText } = render(
      <RequestCard 
        user="Zeynep Kaya" 
        topic="React Native" 
        type="incoming" 
      />
    );

    expect(getByText('Zeynep Kaya')).toBeTruthy();
    expect(getByText('Topic: React Native')).toBeTruthy();
    expect(getByText('Has requested you to be their Mentor.')).toBeTruthy();
    expect(getByText('Open to respond')).toBeTruthy();
  });

  it('renders the reschedule warning state when isReschedule is true', () => {
    const { getByText } = render(
      <RequestCard 
        user="Fatma Demir" 
        topic="Advanced Algorithms" 
        type="incoming" 
        isReschedule={true} 
      />
    );

    expect(getByText('Fatma Demir')).toBeTruthy();
    // Checks for our custom amber text!
    expect(getByText('Requested to reschedule your upcoming session.')).toBeTruthy();
    expect(getByText('Reschedule')).toBeTruthy(); // The badge
  });
});