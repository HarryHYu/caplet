import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
    sidebarWidth: 208,
    resizeSidebar: vi.fn(),
    sidebarWidthBounds: { min: 184, max: 320 },
  }),
}));

import Sidebar from '../components/Sidebar';

afterEach(() => cleanup());

describe('Study sidebar navigation', () => {
  it('exposes the main study workflow destinations', () => {
    render(<MemoryRouter initialEntries={['/study-plan']}><Sidebar /></MemoryRouter>);

    expect(screen.getByRole('link', { name: 'Today' })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: 'Classes' })).toHaveAttribute('href', '/classes');
    expect(screen.getByRole('link', { name: 'Plan' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Practice' })).toHaveAttribute('href', '/practice');
    expect(screen.getByRole('link', { name: 'Subjects' })).toHaveAttribute('href', '/library');
    expect(screen.getByRole('link', { name: 'Results' })).toHaveAttribute('href', '/assessment-log');
    expect(screen.getByRole('link', { name: 'Essays' })).toHaveAttribute('href', '/essays');
    expect(screen.getByRole('link', { name: 'Money' })).toHaveAttribute('href', '/money');
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings');
    expect(screen.queryByRole('link', { name: 'Mastery' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Revision' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Collapse sidebar' })).toBeInTheDocument();
    expect(screen.getByRole('separator', { name: 'Resize sidebar' })).toHaveAttribute('aria-valuenow', '208');
  });

  it('accepts a dashboard resource dropped into the sidebar and lets it be removed', () => {
    const dataTransfer = {
      getData: vi.fn((type) => type === 'application/x-caplet-shortcut' ? 'assessment-dates' : ''),
      setData: vi.fn(),
      dropEffect: 'none',
    };
    render(<MemoryRouter><Sidebar /></MemoryRouter>);

    const sidebar = screen.getByRole('complementary', { name: 'Sidebar navigation' });
    fireEvent.dragOver(sidebar, { dataTransfer });
    expect(screen.getByText('Drop to add shortcut')).toBeInTheDocument();
    fireEvent.drop(sidebar, { dataTransfer });

    expect(screen.getByRole('link', { name: 'Assessment dates' })).toHaveAttribute('href', '/assessments');
    fireEvent.click(screen.getByRole('button', { name: 'Remove Assessment dates from sidebar' }));
    expect(screen.queryByRole('link', { name: 'Assessment dates' })).not.toBeInTheDocument();
  });
});
