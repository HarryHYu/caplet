import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockAuth = vi.hoisted(() => ({
    user: { firstName: 'Ray', lastName: 'W', email: 'ray@example.com' },
    isAuthenticated: true,
    logout: vi.fn(),
}));

vi.mock('../contexts/AuthContext', () => ({ useAuth: () => mockAuth }));
vi.mock('../contexts/ThemeContext', () => ({ useTheme: () => ({ isDark: false, toggleTheme: vi.fn() }) }));
vi.mock('../contexts/LayoutContext', () => ({
  useLayout: () => ({
    toggleNavMode: vi.fn(),
    productMode: 'study',
    setProductMode: vi.fn(),
    lastStudyRoute: '/dashboard',
    lastMoneyRoute: '/money',
  }),
}));

import Navbar from '../components/Navbar';

afterEach(() => {
  cleanup();
  mockAuth.isAuthenticated = true;
});

describe('Navbar accessibility', () => {
  it('keeps the primary study navigation intentionally small', () => {
    render(<MemoryRouter initialEntries={['/dashboard']}><Navbar /></MemoryRouter>);

    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Learn' })).toHaveAttribute('href', '/library');
    expect(screen.queryByRole('link', { name: 'Practice' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Classes' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'More' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Study' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Money' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('keeps theme and navigation layout controls in settings', () => {
    render(<MemoryRouter initialEntries={['/library']}><Navbar /></MemoryRouter>);
    expect(screen.queryByRole('button', { name: 'Switch to dark mode' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Switch to side bar navigation' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'open menu' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('keeps the account email out of the compact navigation', () => {
    render(<MemoryRouter initialEntries={['/dashboard']}><Navbar /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: /Ray/ }));
    expect(screen.queryByText('ray@example.com')).not.toBeInTheDocument();
  });

  it('shows only useful public destinations and auth actions to homepage guests', () => {
    mockAuth.isAuthenticated = false;

    render(<MemoryRouter initialEntries={['/']}><Navbar /></MemoryRouter>);

    expect(screen.getByRole('link', { name: 'Courses' })).toHaveAttribute('href', '/courses');
    expect(screen.getByRole('link', { name: 'Financial tools' })).toHaveAttribute('href', '/money');
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Get started' })).toHaveAttribute('href', '/register');
    expect(screen.queryByRole('group', { name: 'Product mode' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument();
  });
});
