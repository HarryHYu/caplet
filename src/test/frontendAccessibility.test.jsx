import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { MemoryRouter } from 'react-router-dom';
import { FinancialAssumptions, FormField } from '../components/AccessibleUI';
import FinancialTools from '../pages/FinancialTools';
import TaxCalculator from '../pages/tools/TaxCalculator';
import { getRouteMeta } from '../config/routeMeta';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

vi.mock('../contexts/FeatureFlagContext', () => ({
  useFeatureFlags: () => ({ loading: false, isEnabled: () => false }),
}));

afterEach(() => cleanup());

describe('accessible frontend primitives', () => {
  it('associates labels, hints, and errors with controls', () => {
    render(
      <FormField id="amount" label="Amount" hint="Australian dollars" error="Enter an amount">
        {(props) => <input {...props} />}
      </FormField>,
    );
    const input = screen.getByLabelText('Amount');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Australian dollars Enter an amount');
    expect(screen.getByRole('alert')).toHaveTextContent('Enter an amount');
  });

  it('renders the assumptions panel without axe violations', async () => {
    const { container } = render(
      <FinancialAssumptions
        period="2026–27"
        verified="13 July 2026"
        included={['Resident rates']}
        excluded={['Offsets']}
        sources={[{ label: 'ATO', href: 'https://www.ato.gov.au/' }]}
      />,
    );
    const results = await axe.run(container);
    expect(results.violations).toEqual([]);
  });
});

describe('financial tools UX', () => {
  it('combines category filters with search and clears both', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><FinancialTools /></MemoryRouter>);
    await user.click(screen.getByRole('button', { name: 'Debt & Loans' }));
    await user.type(screen.getByLabelText('Search financial calculators'), 'mortgage');
    expect(screen.getByRole('heading', { name: 'Mortgage Calculator' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Income Tax Calculator' })).not.toBeInTheDocument();
    await user.clear(screen.getByLabelText('Search financial calculators'));
    await user.click(screen.getByRole('button', { name: 'All' }));
    expect(screen.getByRole('heading', { name: 'Income Tax Calculator' })).toBeInTheDocument();
  });

  it('exposes labelled tax inputs and current assumptions', () => {
    render(<MemoryRouter><TaxCalculator /></MemoryRouter>);
    expect(screen.getByLabelText('Financial year')).toHaveValue('2026-27');
    expect(screen.getByLabelText(/Annual taxable income/)).toBeRequired();
    expect(screen.getByText('Assumptions and sources')).toBeInTheDocument();
  });
});

describe('route metadata', () => {
  it('provides public metadata and noindexes private routes', () => {
    expect(getRouteMeta('/fintools/tax-calculator').title).toMatch(/Tax Calculator/);
    expect(getRouteMeta('/library/economics').canonicalPath).toBe('/library/economics');
    expect(getRouteMeta('/dashboard').noIndex).toBe(true);
    expect(getRouteMeta('/mastery').noIndex).toBe(true);
  });
});
