import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { LayoutProvider } from '../contexts/LayoutContext';
import ProductModeSwitch from '../components/ProductModeSwitch';
import ProductModeRouteSync from '../components/ProductModeRouteSync';
import LegacyMoneyRedirect from '../components/LegacyMoneyRedirect';
import MoneyOverview from '../pages/MoneyOverview';
import MoneyInflation from '../pages/MoneyInflation';
import MyMoney from '../pages/MyMoney';
import { RequireAuth } from '../App';
import api from '../services/api';

const authState = vi.hoisted(() => ({
  user: { firstName: 'Ari', lastName: 'Student', email: 'ari@example.com' },
  isAuthenticated: true,
  loading: false,
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ ...authState, logout: vi.fn() }),
  AuthProvider: ({ children }) => children,
}));

vi.mock('../services/api', () => ({
  default: {
    getMoneyIndicators: vi.fn().mockResolvedValue({
      indicators: [{
        key: 'au.cpi.headline.yoy',
        displayTitle: 'Inflation',
        nativeFrequency: 'monthly',
        unit: 'percent',
        sourceUrl: 'https://www.abs.gov.au/statistics/economy/price-indexes-and-inflation/consumer-price-index-australia/latest-release',
        current: { value: 3.2, periodLabel: 'June 2026' },
        freshness: { state: 'current', message: 'Latest validated release.' },
      }],
    }),
    getMoneyIndicatorHistory: vi.fn().mockResolvedValue({
      series: {
        title: 'Consumer Price Index, All Groups',
        nativeFrequency: 'monthly',
        sourceUrl: 'https://www.abs.gov.au/statistics/economy/price-indexes-and-inflation/consumer-price-index-australia/latest-release',
        source: { termsUrl: 'https://www.abs.gov.au/about/data-services/application-programming-interfaces-apis/indicator-api/terms-use' },
      },
      current: { value: 3.2, observationDate: '2026-06-01', periodLabel: 'June 2026', retrievedAt: '2026-07-13T00:00:00.000Z', revisionState: 'initial' },
      freshness: { state: 'current', message: 'Latest validated release.' },
      observations: [{ value: 3.2, observationDate: '2026-06-01', periodLabel: 'June 2026', revisionState: 'initial' }],
    }),
    getFinancialProfile: vi.fn().mockResolvedValue({ financialProfile: { savingsBalance: 200, goals: [] } }),
    updateFinancialProfile: vi.fn().mockResolvedValue({ financialProfile: { savingsBalance: 350, goals: [] } }),
  },
}));

function LocationView() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}${location.hash}`}</output>;
}

beforeEach(() => {
  localStorage.clear();
  authState.isAuthenticated = true;
  authState.loading = false;
});

afterEach(() => cleanup());

describe('Money overview and indicator interactions', () => {
  it('turns a first-visit intent into one returning-student next action', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={['/money']}><MoneyOverview /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: 'Money, made understandable.' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Save for something/ }));
    await user.click(screen.getByRole('button', { name: /Start with this/ }));

    expect(screen.getByRole('heading', { name: 'Build a private savings scenario' })).toBeInTheDocument();
    expect(localStorage.getItem('caplet:money:intent')).toBe('"save"');
    expect(localStorage.getItem('caplet:money:onboarded')).toBe('true');
  });

  it('keeps the official-data snapshot separate from a hypothetical experiment', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><MoneyInflation /></MemoryRouter>);

    expect(await screen.findByText('Official ABS series')).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /Official ABS release/ })).toHaveAttribute('href', expect.stringContaining('abs.gov.au'));
    expect(screen.getByRole('table', { name: /Validated annual Consumer Price Index observations/ })).toBeInTheDocument();

    const rate = screen.getByRole('spinbutton', { name: /Assumed annual rate/ });
    await user.clear(rate);
    await user.type(rate, '5');
    await user.click(screen.getByRole('button', { name: 'Run sample scenario' }));

    expect(screen.getByText(/About \$25\.53/)).toBeInTheDocument();
    expect(screen.getByText(/mathematical scenario, not a price forecast/)).toBeInTheDocument();
  });

  it('labels the dated local fallback when official retrieval is unavailable', async () => {
    api.getMoneyIndicatorHistory.mockRejectedValueOnce(new Error('offline'));
    render(<MemoryRouter><MoneyInflation /></MemoryRouter>);

    expect(await screen.findByText('Dated local snapshot · not a live feed')).toBeInTheDocument();
    expect(screen.getByText(/Released 24 June 2026\. Next scheduled release 29 July 2026/)).toBeInTheDocument();
    expect(screen.getByText(/Live retrieval is unavailable/)).toBeInTheDocument();
  });
});

describe('My Money privacy states', () => {
  it('saves, masks, reveals and deletes a sample scenario without profile data', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><MyMoney /></MemoryRouter>);

    expect(screen.getByText(/Teachers, classmates and classroom features cannot see these figures/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save sample scenario' }));
    expect(await screen.findByText(/Sample scenario saved on this device/)).toBeInTheDocument();
    expect(screen.getByText('Figures hidden')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Show figures' }));
    expect(screen.getByText(/Target \$2,000/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByRole('alertdialog', { name: 'Delete this saved scenario?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete scenario' }));

    expect(await screen.findByText('Saved scenario deleted.')).toBeInTheDocument();
    expect(localStorage.getItem('caplet:money:savings-scenario')).toBeNull();
  });

  it('redirects an unauthenticated student before private figures render', async () => {
    authState.isAuthenticated = false;
    render(
      <MemoryRouter initialEntries={['/money/my-money']}>
        <Routes>
          <Route path="/money/my-money" element={<RequireAuth><div>Private figures</div></RequireAuth>} />
          <Route path="/login" element={<><div>Sign in page</div><LocationView /></>} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('Sign in page')).toBeInTheDocument();
    expect(screen.queryByText('Private figures')).not.toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/login');
  });
});

describe('Money routing and mode persistence', () => {
  it('restores the last meaningful Money route when switching modes', async () => {
    const user = userEvent.setup();
    localStorage.setItem('caplet:last-money-route', '/money/economy/inflation');
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <LayoutProvider>
          <ProductModeSwitch />
          <LocationView />
        </LayoutProvider>
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: 'Money' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/money/economy/inflation');
    await waitFor(() => expect(localStorage.getItem('caplet:product-mode')).toBe('money'));
  });

  it('detects a Money deep link without rewriting browser history', async () => {
    render(
      <MemoryRouter initialEntries={['/money/economy/inflation?from=test']}>
        <LayoutProvider>
          <ProductModeRouteSync />
          <LocationView />
        </LayoutProvider>
      </MemoryRouter>
    );

    expect(screen.getByTestId('location')).toHaveTextContent('/money/economy/inflation?from=test');
    await waitFor(() => expect(localStorage.getItem('caplet:product-mode')).toBe('money'));
    await waitFor(() => expect(localStorage.getItem('caplet:last-money-route')).toBe('/money/economy/inflation?from=test'));
  });

  it('preserves old tool bookmarks, query strings and hashes', async () => {
    render(
      <MemoryRouter initialEntries={['/fintools/salary?example=student#result']}>
        <Routes>
          <Route path="/fintools/*" element={<LegacyMoneyRedirect prefix="/fintools" />} />
          <Route path="/money/tools/*" element={<LocationView />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByTestId('location')).toHaveTextContent('/money/tools/salary?example=student#result');
  });
});
