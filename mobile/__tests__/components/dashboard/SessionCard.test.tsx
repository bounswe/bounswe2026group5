import React from 'react';
import { render } from '@testing-library/react-native';
import { SessionCard } from '@/components/dashboard/SessionCard';

describe('SessionCard Component', () => {
  it('renders session details correctly', () => {
    const { getByText } = render(
      <SessionCard 
        user="Ahmet Yılmaz" 
        date="APR 01" 
        time="14:00 - 15:00" 
        status="Upcoming" 
      />
    );

    expect(getByText('Ahmet Yılmaz')).toBeTruthy();
    expect(getByText('APR')).toBeTruthy();
    expect(getByText('01')).toBeTruthy();
    expect(getByText('14:00 - 15:00')).toBeTruthy();
    expect(getByText('Upcoming')).toBeTruthy();
  });
});