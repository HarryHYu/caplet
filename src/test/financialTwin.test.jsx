import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// The page reads the twin connection, the stored categorization and a
// projection in parallel on mount. vi.hoisted so the mock factory (which is
// hoisted above imports) can see the fixture.
const PROJECTION = vi.hoisted(() => ({
  seed: 1,
  trials: 500,
  horizonYears: 20,
  assumptionsVersion: 'test-1',
  assumptions: [
    { key: 'superGuaranteeRate', value: 0.12, effectiveDate: '2025-07-01', source: 'ATO super guarantee percentage' },
  ],
  series: {
    hecsBalance: [
      { year: 1, p10: 100, p25: 110, p50: 120, p75: 130, p90: 140 },
      { year: 2, p10: 90, p25: 100, p50: 110, p75: 120, p90: 130 },
    ],
    superBalance: [
      { year: 1, p10: 1, p25: 2, p50: 3, p75: 4, p90: 5 },
      { year: 2, p10: 2, p25: 3, p50: 4, p75: 5, p90: 6 },
    ],
    savingsBalance: [
      { year: 1, p10: 1, p25: 2, p50: 3, p75: 4, p90: 5 },
      { year: 2, p10: 2, p25: 3, p50: 4, p75: 5, p90: 6 },
    ],
    netPosition: [
      { year: 1, p10: 1, p25: 2, p50: 3, p75: 4, p90: 5 },
      { year: 2, p10: 2, p25: 3, p50: 4, p75: 5, p90: 6 },
    ],
  },
  summary: 'Across 500 simulated scenarios the ranges above follow from the stated assumptions.',
  disclaimer: 'These are simulated scenarios — general information, not personal advice.',
}));

vi.mock('../services/api', () => ({
  default: {
    getFinancialTwinConnection: vi.fn().mockResolvedValue({ connection: null }),
    getFinancialTwinCategorized: vi.fn().mockResolvedValue({ connected: false, summary: null, uncertain: [] }),
    getFinancialTwinProjection: vi.fn().mockResolvedValue({ projection: PROJECTION }),
    connectFinancialTwin: vi.fn(),
    revokeFinancialTwin: vi.fn(),
  },
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true, user: { firstName: 'Test' } }),
}));

import FinancialTwin from '../pages/tools/FinancialTwin';

const renderPage = () =>
  render(
    <MemoryRouter>
      <FinancialTwin />
    </MemoryRouter>,
  );

describe('FinancialTwin page', () => {
  it('renders the trajectory, consent card, assumptions provenance and disclaimer', async () => {
    renderPage();

    expect(await screen.findByText(/Simulated trajectory/i)).toBeInTheDocument();
    // Consent card offers the mock connection and is explicit about the mock.
    expect(screen.getByText(/Connect sample data/i)).toBeInTheDocument();
    expect(screen.getByText(/mocked, synthetic/i)).toBeInTheDocument();
    // Assumptions carry effective date + source, rendered for the user.
    expect(screen.getByText(/Every assumption, on the table/i)).toBeInTheDocument();
    expect(screen.getByText('2025-07-01')).toBeInTheDocument();
    expect(screen.getByText(/ATO super guarantee percentage/i)).toBeInTheDocument();
    // Scenario framing + disclaimer visible.
    expect(screen.getByText(/not personal advice/i)).toBeInTheDocument();
    expect(screen.getByText(/500 simulated scenarios/i)).toBeInTheDocument();
  });

  it('exposes the seed so runs are reproducible, and controls for trials + horizon', async () => {
    renderPage();
    expect(await screen.findByLabelText(/Scenario draw/i)).toHaveValue(1);
    expect(screen.getByLabelText(/Simulated paths/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /10 years/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /20 years/i })).toBeInTheDocument();
  });

  it('never renders advice phrasing', async () => {
    renderPage();
    await screen.findByText(/Simulated trajectory/i);
    expect(document.body.textContent).not.toMatch(/you should|we recommend|best option/i);
  });

  it('connects, shows categorized totals with the HECS framing and uncertain flags, then revokes with a purge confirmation', async () => {
    const api = (await import('../services/api')).default;
    api.connectFinancialTwin.mockResolvedValue({
      connection: {
        status: 'active',
        accountsSnapshot: [{ accountId: 'a1', productCategory: 'TRANS_AND_SAVINGS_ACCOUNTS', balance: 2143 }],
      },
      summary: { transactionCount: 70 },
      partial: false,
    });
    api.getFinancialTwinCategorized.mockResolvedValueOnce({ connected: false, summary: null, uncertain: [] }).mockResolvedValue({
      connected: true,
      summary: {
        transactionCount: 70,
        totalsByCategory: { income: 34006, hecs: -750, bnpl: -493, spending: -10576, uncertain: -150 },
        monthlyIncomeEstimate: 5848,
        monthlySpendEstimate: 1819,
        uncertainCount: 1,
        uncertainRatio: 0.014,
      },
      uncertain: [{ id: 'u1', description: 'ATO PAYMENT PLAN 004521', amount: -150, confidence: 0.4 }],
    });
    api.revokeFinancialTwin.mockResolvedValue({ connection: { status: 'revoked', accountsSnapshot: null }, purged: 70 });

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /Connect sample data/i }));

    expect(await screen.findByText(/Consent active/i)).toBeInTheDocument();
    expect(await screen.findByText(/What the data shows/i)).toBeInTheDocument();
    // HECS is framed on its own terms, never as consumer interest.
    expect(screen.getByText(/not consumer interest/i)).toBeInTheDocument();
    // Ambiguity is flagged, not guessed.
    expect(screen.getByText('ATO PAYMENT PLAN 004521')).toBeInTheDocument();
    expect(screen.getAllByText(/^Uncertain$/i).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /Withdraw consent/i }));
    expect(await screen.findByText(/70 stored transactions deleted/i)).toBeInTheDocument();
    expect(api.revokeFinancialTwin).toHaveBeenCalledTimes(1);
  });
});
