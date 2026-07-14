import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockAuth = vi.hoisted(() => ({
    user: { firstName: 'Ray', lastName: 'W', email: 'ray@example.com' },
    isAuthenticated: false,
    logout: vi.fn(),
}));

vi.mock('../contexts/AuthContext', () => ({ useAuth: () => mockAuth }));
vi.mock('../contexts/ThemeContext', () => ({ useTheme: () => ({ isDark: false, toggleTheme: vi.fn() }) }));
vi.mock('../contexts/FeatureFlagContext', () => ({ useFeatureFlags: () => ({ loading: false, isEnabled: () => true }) }));
vi.mock('../contexts/LayoutContext', () => ({
    useLayout: () => ({
        productMode: 'study',
        setProductMode: vi.fn(),
        lastStudyRoute: '/dashboard',
        lastMoneyRoute: '/money',
    }),
}));

import TabletPublicNavbar from '../components/TabletPublicNavbar';
import TabletDashboardNavbar from '../components/TabletDashboardNavbar';

afterEach(() => {
    cleanup();
    mockAuth.isAuthenticated = false;
});

describe('tablet navigation variants', () => {
    it('keeps workspace modes out of the signed-out public header', () => {
        render(<MemoryRouter initialEntries={['/']}><TabletPublicNavbar /></MemoryRouter>);

        expect(screen.getByTestId('tablet-public-navbar')).toBeInTheDocument();
        expect(screen.getByRole('navigation', { name: 'Public navigation' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Get started' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Study/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Money/i })).not.toBeInTheDocument();
    });

    it('uses an independent workspace header for authenticated users', () => {
        mockAuth.isAuthenticated = true;

        render(
            <MemoryRouter initialEntries={['/dashboard']}>
                <TabletPublicNavbar />
                <TabletDashboardNavbar />
            </MemoryRouter>,
        );

        expect(screen.queryByTestId('tablet-public-navbar')).not.toBeInTheDocument();
        expect(screen.getByTestId('tablet-dashboard-navbar')).toBeInTheDocument();
        expect(screen.getByRole('navigation', { name: 'Dashboard navigation' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');
        expect(screen.getByRole('group', { name: 'Product mode' })).toBeInTheDocument();
    });
});
