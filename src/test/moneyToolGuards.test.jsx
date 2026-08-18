import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../lib/useReveal', () => ({ useReveal: vi.fn(), revealOnScroll: vi.fn() }));

import CompoundInterest from '../pages/tools/CompoundInterest';
import CreditCardPayoff from '../pages/tools/CreditCardPayoff';
import FIRENumber from '../pages/tools/FIRENumber';
import RentVsBuy from '../pages/tools/RentVsBuy';
import SavingsGoal from '../pages/tools/SavingsGoal';
import { inflationHeadline } from '../data/moneyPrototype';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const renderTool = (tool) => render(<MemoryRouter>{createElement(tool)}</MemoryRouter>);
const submit = (name) => fireEvent.click(screen.getByRole('button', { name }));
const type = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

// A single guard for the whole family: no rendered tool result may ever contain
// "NaN" or "Infinity" — that was the visible symptom of every parsing hole.
const expectNoBrokenNumbers = (container) => {
  expect(container.textContent).not.toMatch(/NaN/);
  expect(container.textContent).not.toMatch(/Infinity/);
};

describe('CompoundInterest', () => {
  it('accepts a 0% rate instead of calling it invalid', () => {
    const { container } = renderTool(CompoundInterest);
    type(/Starting Amount/i, '1000');
    type(/Monthly Contribution/i, '100');
    type(/Annual Interest Rate/i, '0');
    type(/Time Horizon/i, '10');
    submit(/Calculate Growth/i);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getAllByText('$13,000.00').length).toBeGreaterThan(0);
    expectNoBrokenNumbers(container);
  });

  it('still rejects a blank rate', () => {
    renderTool(CompoundInterest);
    type(/Time Horizon/i, '10');
    submit(/Calculate Growth/i);

    expect(screen.getByRole('alert')).toHaveTextContent(/valid interest rate/i);
  });
});

describe('CreditCardPayoff', () => {
  it('rejects an empty APR rather than silently treating it as a 0% loan', () => {
    const { container } = renderTool(CreditCardPayoff);
    type(/Current Balance/i, '5000');
    type(/Monthly Payment/i, '250');
    submit(/Calculate Payoff/i);

    expect(screen.getByRole('alert')).toHaveTextContent(/valid values/i);
    expectNoBrokenNumbers(container);
  });

  it('says so when the minimum payment can never clear the balance', () => {
    const { container } = renderTool(CreditCardPayoff);
    type(/Current Balance/i, '20000');
    type(/Annual Interest Rate/i, '30');
    type(/Monthly Payment/i, '800');
    submit(/Calculate Payoff/i);

    expect(screen.getByText(/never clears the balance/i)).toBeInTheDocument();
    expect(screen.queryByText(/Save \$/i)).not.toBeInTheDocument();
    expectNoBrokenNumbers(container);
  });

  it('quotes a saving against minimum payments at an ordinary APR', () => {
    const { container } = renderTool(CreditCardPayoff);
    type(/Current Balance/i, '5000');
    type(/Annual Interest Rate/i, '19.9');
    type(/Monthly Payment/i, '250');
    submit(/Calculate Payoff/i);

    expect(screen.getByText(/Versus minimum payments/i)).toBeInTheDocument();
    expect(screen.queryByText(/never clears the balance/i)).not.toBeInTheDocument();
    expectNoBrokenNumbers(container);
  });
});

describe('FIRENumber', () => {
  it('rejects a blank withdrawal rate instead of rendering $NaN', () => {
    const { container } = renderTool(FIRENumber);
    type(/Monthly Expenses in Retirement/i, '4000');
    type(/Safe Withdrawal Rate/i, '');
    submit(/Calculate FIRE Number/i);

    expect(screen.getByRole('alert')).toHaveTextContent(/valid monthly expenses/i);
    expectNoBrokenNumbers(container);
  });

  it('projects a finite number of years with a 0% expected return', () => {
    const { container } = renderTool(FIRENumber);
    type(/Monthly Expenses in Retirement/i, '1000');
    type(/Safe Withdrawal Rate/i, '4');
    type(/Monthly Contributions/i, '1000');
    type(/Expected Annual Return/i, '0');
    submit(/Calculate FIRE Number/i);

    expect(screen.getAllByText('$300,000.00').length).toBeGreaterThan(0);
    expect(screen.getByText('25.0 years')).toBeInTheDocument();
    expectNoBrokenNumbers(container);
  });
});

describe('RentVsBuy', () => {
  it('rejects a blank mortgage rate instead of rendering $NaN', () => {
    const { container } = renderTool(RentVsBuy);
    type(/Home Purchase Price/i, '800000');
    type(/Monthly Rent/i, '2500');
    submit(/Compare Costs/i);

    expect(screen.getByRole('alert')).toHaveTextContent(/fill in all required fields/i);
    expectNoBrokenNumbers(container);
  });

  it('formats currency as en-AU regardless of the host locale', () => {
    const { container } = renderTool(RentVsBuy);
    type(/Home Purchase Price/i, '800000');
    type(/Mortgage Rate/i, '6');
    type(/Monthly Rent/i, '2500');
    submit(/Compare Costs/i);

    // Comma thousands separators, no decimals — never "$1.234.567".
    expect(container.textContent).toMatch(/\$\d{1,3}(,\d{3})+(?!\.\d)/);
    expect(container.textContent).not.toMatch(/\$\d{1,3}(\.\d{3})+/);
    expectNoBrokenNumbers(container);
  });
});

describe('SavingsGoal', () => {
  it('explains an unreachable goal instead of printing "Infinity months"', () => {
    const { container } = renderTool(SavingsGoal);
    type(/Target Amount/i, '10000');
    type(/Current Savings/i, '0');
    type(/Monthly Contribution/i, '0');
    type(/Interest Rate/i, '0');
    submit(/Calculate Timeline/i);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expectNoBrokenNumbers(container);
  });

  it('never shows negative interest earned', () => {
    const { container } = renderTool(SavingsGoal);
    type(/Target Amount/i, '10000');
    type(/Current Savings/i, '250');
    type(/Monthly Contribution/i, '137');
    submit(/Calculate Timeline/i);

    expect(container.textContent).not.toMatch(/-\$/);
    expectNoBrokenNumbers(container);
  });
});

describe('inflationHeadline', () => {
  it('uses the reference period when there is one', () => {
    expect(inflationHeadline({ value: 4, periodLabel: 'May 2026' }))
      .toBe('Inflation was 4.0% through the year to May 2026.');
  });

  it('falls back to the observation date rather than "undefined"', () => {
    expect(inflationHeadline({ value: 3.25, observationDate: '2026-05-31' }))
      .toBe('Inflation was 3.3% through the year to 2026-05-31.');
  });

  it('drops the period entirely when neither is available', () => {
    const headline = inflationHeadline({ value: 4 });
    expect(headline).not.toMatch(/undefined/);
    expect(headline).toBe('Inflation was 4.0% through the year to the latest reference period.');
  });

  it.each([null, undefined, {}, { value: null }, { value: 'n/a' }])('reports missing data for %p', (current) => {
    expect(inflationHeadline(current)).toBe('Inflation data is unavailable right now.');
  });
});

describe('sponsored listings placement', () => {
  it.each([
    ['LoanRepayment', () => import('../pages/tools/LoanRepayment'), /Calculate Repayments/i, [[/Loan Amount/i, '30000'], [/Annual Rate/i, '7'], [/Loan Term/i, '5']]],
    ['MortgageCalculator', () => import('../pages/tools/MortgageCalculator'), /Calculate Repayments/i, [[/Property Loan Amount/i, '600000'], [/Annual Rate/i, '6'], [/Loan Term/i, '30']]],
  ])('%s keeps affiliate listings outside the results panel', async (_name, load, buttonName, inputs) => {
    const { default: tool } = await load();
    renderTool(tool);
    for (const [label, value] of inputs) type(label, value);
    submit(buttonName);

    const sponsored = screen.getByRole('region', { name: /Sponsored listings/i });
    expect(sponsored).toBeInTheDocument();

    // The educational results panel (the aria-live region) must not contain
    // the sponsored block — it now sits below the results card entirely.
    const resultsPanel = document.querySelector('[aria-live="polite"]');
    expect(resultsPanel).not.toBeNull();
    expect(within(resultsPanel).queryByRole('region', { name: /Sponsored listings/i })).toBeNull();
    expect(resultsPanel.contains(sponsored)).toBe(false);
  });
});
