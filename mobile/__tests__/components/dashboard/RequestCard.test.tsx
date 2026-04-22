import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { RequestCard } from '@/components/dashboard/RequestCard';

describe('RequestCard Component', () => {
  it('renders incoming request and fires onPress', () => {
    const mockOnPress = jest.fn();
    const { getByTestId } = render(
      <RequestCard
        user="Zeynep Kaya"
        topic="React Native"
        type="incoming"
        onPress={mockOnPress}
      />
    );

    expect(getByTestId('request-card')).toBeTruthy();
    expect(getByTestId('type-badge-incoming')).toBeTruthy();

    fireEvent.press(getByTestId('request-card'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('renders outgoing request with correct badge', () => {
    const { getByTestId, queryByTestId } = render(
      <RequestCard
        user="Kemal Aydın"
        topic="System Design"
        type="outgoing"
      />
    );

    expect(getByTestId('request-card')).toBeTruthy();
    expect(getByTestId('type-badge-outgoing')).toBeTruthy();
    expect(queryByTestId('type-badge-incoming')).toBeNull();
  });

  it('shows reschedule badge when isReschedule is true', () => {
    const { getByTestId } = render(
      <RequestCard
        user="Fatma Demir"
        topic="Advanced Algorithms"
        type="incoming"
        isReschedule={true}
      />
    );

    expect(getByTestId('reschedule-badge')).toBeTruthy();
  });

  it('hides reschedule badge when isReschedule is false', () => {
    const { queryByTestId } = render(
      <RequestCard
        user="Fatma Demir"
        topic="Advanced Algorithms"
        type="incoming"
        isReschedule={false}
      />
    );

    expect(queryByTestId('reschedule-badge')).toBeNull();
  });

  it('renders show-profile button and fires onShowProfile', () => {
    const mockOnShowProfile = jest.fn();
    const { getByTestId } = render(
      <RequestCard
        user="Zeynep Kaya"
        topic="React Native"
        type="incoming"
        onShowProfile={mockOnShowProfile}
      />
    );

    expect(getByTestId('show-profile-button')).toBeTruthy();
    fireEvent.press(getByTestId('show-profile-button'));
    expect(mockOnShowProfile).toHaveBeenCalledTimes(1);
  });

  it('hides show-profile button when onShowProfile is not provided', () => {
    const { queryByTestId } = render(
      <RequestCard
        user="Zeynep Kaya"
        topic="React Native"
        type="incoming"
      />
    );

    expect(queryByTestId('show-profile-button')).toBeNull();
  });
});