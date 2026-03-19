// web/src/components/layout/__tests__/AuthorizedHeader.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AuthorizedHeader } from '../AuthorizedHeader';

// Mock the TanStack Router
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode, to: string }) => <a href={to}>{children}</a>,
  useRouter: () => ({
    navigate: vi.fn(),
  }),
}));

describe('AuthorizedHeader Component', () => {
  it('renders the branding text', () => {
    render(<AuthorizedHeader />);
    expect(screen.getByText('Mentorship')).toBeInTheDocument();
  });

  it('renders the dummy navigation links', () => {
    render(<AuthorizedHeader />);
    expect(screen.getByText('Discover')).toBeInTheDocument();
    expect(screen.getByText('Requests')).toBeInTheDocument();
    expect(screen.getByText('Sessions')).toBeInTheDocument();
  });

  it('renders the Demo Logout button', () => {
    render(<AuthorizedHeader />);
    expect(screen.getByRole('button', { name: /demo logout/i })).toBeInTheDocument();
  });
});