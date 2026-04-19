import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SkillsCloud } from '@/components/profile/SkillsCloud';

jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return {
    Ionicons: 'View',
  };
});

describe('SkillsCloud Component', () => {
  const mockSkills = ['React Native', 'System Design', 'TypeScript'];

  it('renders the title and all skills', () => {
    const { getByText } = render(
      <SkillsCloud 
        title="My Expertise" 
        skills={mockSkills} 
        variant="mentor" 
      />
    );

    expect(getByText('My Expertise')).toBeTruthy();
    expect(getByText('React Native')).toBeTruthy();
    expect(getByText('System Design')).toBeTruthy();
    expect(getByText('TypeScript')).toBeTruthy();
  });

  it('triggers onEdit when the pencil icon is pressed', () => {
    const mockOnEdit = jest.fn();
    const { getByTestId } = render(
      <SkillsCloud 
        title="My Expertise" 
        skills={mockSkills} 
        variant="mentor" 
        onEdit={mockOnEdit}
      />
    );

    // Note: You might need to add testID="edit-button" to your TouchableOpacity in SkillsCloud.tsx for this specific trigger to work!
    const editButton = getByTestId('edit-button');
    fireEvent.press(editButton);
    
    expect(mockOnEdit).toHaveBeenCalledTimes(1);
  });
});