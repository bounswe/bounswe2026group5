// web/src/components/layout/__test__/AuthorizedHeader.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AuthorizedHeader } from '../AuthorizedHeader';

// Mock TanStack Router hooks
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, className }: any) => <a href={to} className={className}>{children}</a>,
  useRouter: () => ({ navigate: vi.fn() }),
  useNavigate: () => vi.fn(),
  useSearch: () => ({ mode: 'mentee' }),
  useLocation: () => ({ pathname: '/dashboard' }),
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
  });

  it('renders the Demo Logout button', () => {
    render(<AuthorizedHeader />);
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
  });
});