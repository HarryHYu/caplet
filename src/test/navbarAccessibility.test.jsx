import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  it('keeps core destinations visible and exposes secondary navigation', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={['/dashboard']}><Navbar /></MemoryRouter>);

    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Library' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Practice' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Classes' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Study' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Money' })).toHaveAttribute('aria-pressed', 'false');

    const more = screen.getByRole('button', { name: 'More' });
    await user.click(more);
    expect(more).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: 'Study Plan' })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(more).toHaveAttribute('aria-expanded', 'false');
    expect(more).toHaveFocus();
  });

  it('uses accessible labels and expanded state for icon controls', () => {
    render(<MemoryRouter initialEntries={['/library']}><Navbar /></MemoryRouter>);
    expect(screen.getByRole('button', { name: 'Switch to dark mode' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'open menu' })).toHaveAttribute('aria-expanded', 'false');
  });
});
