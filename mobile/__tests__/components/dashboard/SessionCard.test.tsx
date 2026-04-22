import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SessionCard } from '@/components/dashboard/SessionCard';

describe('SessionCard Component', () => {
  it('renders card with Upcoming status and fires onPress', () => {
    const mockOnPress = jest.fn();
    const { getByTestId } = render(
      <SessionCard
        user="Ahmet Yılmaz"
        date="APR 01"
        time="14:00 - 15:00"
        status="Upcoming"
        onPress={mockOnPress}
      />
    );

    expect(getByTestId('session-card-Upcoming')).toBeTruthy();
    expect(getByTestId('status-badge')).toBeTruthy();

    fireEvent.press(getByTestId('session-card-Upcoming'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('renders card with Pending status', () => {
    const { getByTestId } = render(
      <SessionCard
        user="Mentor User"
        date="MAY 10"
        time="09:00 - 10:00"
        status="Pending"
      />
    );

    expect(getByTestId('session-card-Pending')).toBeTruthy();
    expect(getByTestId('status-badge')).toBeTruthy();
  });

  it('renders card with Cancelled status', () => {
    const { getByTestId } = render(
      <SessionCard
        user="Mentor User"
        date="MAY 10"
        time="09:00 - 10:00"
        status="Cancelled"
      />
    );

    expect(getByTestId('session-card-Cancelled')).toBeTruthy();
  });

  it('renders card with Completed status', () => {
    const { getByTestId } = render(
      <SessionCard
        user="Mentor User"
        date="MAY 10"
        time="09:00 - 10:00"
        status="Completed"
      />
    );

    expect(getByTestId('session-card-Completed')).toBeTruthy();
  });

  it('does not call onPress when no handler is provided', () => {
    const { getByTestId } = render(
      <SessionCard
        user="Mentor User"
        date="MAY 10"
        time="09:00 - 10:00"
        status="Upcoming"
      />
    );

    // Should render without crashing even without onPress
    expect(getByTestId('session-card-Upcoming')).toBeTruthy();
  });
});