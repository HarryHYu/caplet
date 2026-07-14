import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { firstName: 'Ray', lastName: 'W', email: 'ray@example.com' },
    isAuthenticated: true,
    logout: vi.fn(),
  }),
}));
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

afterEach(() => cleanup());

describe('Navbar accessibility', () => {
  it('keeps the primary study navigation intentionally small', () => {
    render(<MemoryRouter initialEntries={['/dashboard']}><Navbar /></MemoryRouter>);

    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Library' })).toBeInTheDocument();
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
});
