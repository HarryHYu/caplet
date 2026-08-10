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
    expect(screen.getByRole('link', { name: 'Classes' })).toHaveAttribute('href', '/classes');
    expect(screen.getByRole('link', { name: 'Subjects' })).toHaveAttribute('href', '/library');
    expect(screen.getByRole('link', { name: 'Practice' })).toHaveAttribute('href', '/practice');
    expect(screen.getByRole('link', { name: 'Plan' })).toHaveAttribute('href', '/study-plan');
    expect(screen.getByRole('link', { name: 'Essays' })).toHaveAttribute('href', '/essays');
    expect(screen.getByRole('link', { name: 'Money' })).toHaveAttribute('href', '/money');
    expect(screen.queryByRole('button', { name: 'More' })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Product mode' })).not.toBeInTheDocument();
  });

  it('offers a way back to the main app from money mode', () => {
    mockLayout.productMode = 'money';
    try {
      render(<MemoryRouter initialEntries={['/money/tools']}><Navbar /></MemoryRouter>);

      // The mode switch is the escape hatch: money mode replaces the study
      // links and hides the hamburger, so without it users were trapped.
      expect(screen.getByRole('group', { name: 'Product mode' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Study' })).toBeInTheDocument();
      // The logo always leads back to the main app, even inside Money.
      expect(screen.getByRole('link', { name: /Caplet/ })).toHaveAttribute('href', '/dashboard');
    } finally {
      mockLayout.productMode = 'study';
    }
  });

  it('keeps the signed-out money header down to auth actions', () => {
    mockAuth.isAuthenticated = false;
    mockLayout.productMode = 'money';
    try {
      render(<MemoryRouter initialEntries={['/money']}><Navbar /></MemoryRouter>);

      // The switch + both auth buttons cannot share a 360px bar; visitors
      // escape via the logo and can enter the app through Sign in.
      expect(screen.queryByRole('group', { name: 'Product mode' })).not.toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    } finally {
      mockLayout.productMode = 'study';
    }
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
