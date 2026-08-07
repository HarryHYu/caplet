import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockAuth = vi.hoisted(() => ({
    user: { firstName: 'Ray', lastName: 'W', email: 'ray@example.com' },
    isAuthenticated: true,
    logout: vi.fn(),
}));
const mockLayout = vi.hoisted(() => ({
  toggleNavMode: vi.fn(),
  productMode: 'study',
  setProductMode: vi.fn(),
  lastStudyRoute: '/dashboard',
  lastMoneyRoute: '/money',
}));

vi.mock('../contexts/AuthContext', () => ({ useAuth: () => mockAuth }));
vi.mock('../contexts/ThemeContext', () => ({ useTheme: () => ({ isDark: false, toggleTheme: vi.fn() }) }));
vi.mock('../contexts/LayoutContext', () => ({ useLayout: () => mockLayout }));

import Navbar from '../components/Navbar';

afterEach(() => {
  cleanup();
  mockAuth.isAuthenticated = true;
});

describe('Navbar accessibility', () => {
  it('keeps the primary study navigation intentionally small', () => {
    render(<MemoryRouter initialEntries={['/dashboard']}><Navbar /></MemoryRouter>);

    expect(screen.getByRole('link', { name: 'Today' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Subjects' })).toHaveAttribute('href', '/library');
    expect(screen.getByRole('link', { name: 'Practice' })).toHaveAttribute('href', '/practice');
    expect(screen.getByRole('link', { name: 'Plan' })).toHaveAttribute('href', '/study-plan');
    expect(screen.getByRole('link', { name: 'Money' })).toHaveAttribute('href', '/money');
    expect(screen.queryByRole('link', { name: 'Classes' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'More' })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Product mode' })).not.toBeInTheDocument();
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

  it('keeps the guest header focused on authentication', () => {
    mockAuth.isAuthenticated = false;
    render(<MemoryRouter initialEntries={['/']}><Navbar /></MemoryRouter>);

    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Get started' })).toHaveAttribute('href', '/register');
    expect(screen.queryByRole('link', { name: 'Resource library' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Courses' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Assessment dates' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Financial tools' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Team' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'open menu' })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Product mode' })).not.toBeInTheDocument();
  });
});
