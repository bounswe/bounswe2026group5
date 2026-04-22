import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SkillsCloud } from '@/components/profile/SkillsCloud';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'View',
}));

describe('SkillsCloud Component', () => {
  it('renders skills without overflow when count is within limit', () => {
    const skills = ['React Native', 'System Design', 'TypeScript'];
    const { queryByTestId } = render(
      <SkillsCloud
        title="My Expertise"
        skills={skills}
        variant="mentor"
      />
    );

    // No "+X more" button since count <= MAX_VISIBLE (5)
    expect(queryByTestId('view-all-button')).toBeNull();
  });

  it('renders view-all button when skills exceed MAX_VISIBLE', () => {
    const skills = ['React', 'TypeScript', 'Python', 'Docker', 'GraphQL', 'AWS'];
    const { getByTestId } = render(
      <SkillsCloud
        title="My Expertise"
        skills={skills}
        variant="mentor"
        onViewAll={jest.fn()}
      />
    );

    expect(getByTestId('view-all-button')).toBeTruthy();
  });

  it('fires onViewAll when the overflow button is pressed', () => {
    const mockOnViewAll = jest.fn();
    const skills = ['React', 'TypeScript', 'Python', 'Docker', 'GraphQL', 'AWS'];
    const { getByTestId } = render(
      <SkillsCloud
        title="My Expertise"
        skills={skills}
        variant="mentor"
        onViewAll={mockOnViewAll}
      />
    );

    fireEvent.press(getByTestId('view-all-button'));
    expect(mockOnViewAll).toHaveBeenCalledTimes(1);
  });

  it('renders edit button when onEdit is provided and fires callback', () => {
    const mockOnEdit = jest.fn();
    const { getByTestId } = render(
      <SkillsCloud
        title="My Expertise"
        skills={['React']}
        variant="mentor"
        onEdit={mockOnEdit}
      />
    );

    fireEvent.press(getByTestId('edit-button'));
    expect(mockOnEdit).toHaveBeenCalledTimes(1);
  });

  it('renders empty state when skills list is empty', () => {
    const { getByTestId } = render(
      <SkillsCloud
        title="My Expertise"
        skills={[]}
        variant="mentor"
      />
    );

    expect(getByTestId('empty-state')).toBeTruthy();
  });

  it('renders editable empty state when onEdit is provided and skills is empty', () => {
    const mockOnEdit = jest.fn();
    const { getByTestId } = render(
      <SkillsCloud
        title="My Expertise"
        skills={[]}
        variant="mentor"
        onEdit={mockOnEdit}
      />
    );

    fireEvent.press(getByTestId('empty-state'));
    expect(mockOnEdit).toHaveBeenCalledTimes(1);
  });
});