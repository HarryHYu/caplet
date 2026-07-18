import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { firstName: 'Ada', email: 'ada@example.com' },
    isAuthenticated: true,
  }),
}));

vi.mock('../contexts/FeatureFlagContext', () => ({
  useFeatureFlags: () => ({ loading: false, isEnabled: () => true }),
}));

vi.mock('../contexts/LayoutContext', () => ({
  useLayout: () => ({
    sidebarCollapsed: false,
    toggleSidebar: vi.fn(),
    sidebarWidth: 304,
    resizeSidebar: vi.fn(),
    sidebarWidthBounds: { min: 240, max: 420 },
    productMode: 'study',
  }),
}));

import Sidebar from '../components/Sidebar';

afterEach(() => cleanup());

describe('Study sidebar navigation', () => {
  it('exposes the main study workflow destinations', () => {
    render(<MemoryRouter initialEntries={['/study-plan']}><Sidebar /></MemoryRouter>);

    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: 'Study plan' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Practice' })).toHaveAttribute('href', '/practice');
    expect(screen.getByRole('link', { name: 'Mastery' })).toHaveAttribute('href', '/mastery');
    expect(screen.getByRole('link', { name: 'Revision' })).toHaveAttribute('href', '/revision');
    expect(screen.getByRole('link', { name: 'Essays' })).toHaveAttribute('href', '/essays');
    expect(screen.getByRole('link', { name: 'Learn' })).toHaveAttribute('href', '/library');
    expect(screen.queryByRole('link', { name: 'Courses' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Classes' })).toHaveAttribute('href', '/classes');
    expect(screen.queryByText('ada@example.com')).not.toBeInTheDocument();
    expect(screen.queryByText('Workspace')).not.toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toHaveClass('nav-scrollbar-hidden');
  });
});
