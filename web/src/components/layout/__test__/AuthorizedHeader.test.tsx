// web/src/components/layout/__test__/AuthorizedHeader.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AuthorizedHeader } from '../AuthorizedHeader';

// Properly mock TanStack Router and add the missing hooks!
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    Link: ({ children, to }: { children: React.ReactNode, to: string }) => <a href={to}>{children}</a>,
    useRouter: () => ({ navigate: vi.fn() }),
    useNavigate: () => vi.fn(), 
    useSearch: () => ({ mode: 'mentee' }), 
  }
})

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