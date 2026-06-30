import { describe, it, expect } from 'vitest';
import { nextAction } from '../lib/nextAction';

describe('nextAction', () => {
  it('prioritizes debt when any debt has a balance', () => {
    const action = nextAction({
      savingsBalance: 50000,
      superBalance: 100000,
      debts: [{ label: 'Visa', balance: 3000, rate: 19.9 }],
    });
    expect(action.key).toBe('debt');
    expect(action.to).toContain('/tools/credit-card-payoff');
  });

  it('targets the highest-rate debt in the deep link', () => {
    const action = nextAction({
      debts: [
        { label: 'Car loan', balance: 10000, rate: 7 },
        { label: 'Visa', balance: 3000, rate: 21.9 },
      ],
    });
    expect(action.key).toBe('debt');
    expect(action.to).toContain('balance=3000');
    expect(action.to).toContain('apr=21.9');
  });

  it('recommends an emergency fund when savings are low and there is no debt', () => {
    const action = nextAction({ savingsBalance: 500, superBalance: 100000, debts: [] });
    expect(action.key).toBe('savings');
    expect(action.to).toBe('/tools/emergency-fund');
  });

  it('treats null savings as low (new user) → emergency fund', () => {
    const action = nextAction({ savingsBalance: null, superBalance: null, debts: [] });
    expect(action.key).toBe('savings');
  });

  it('recommends boosting super when savings are healthy but super is low', () => {
    const action = nextAction({ savingsBalance: 10000, superBalance: 5000, debts: [] });
    expect(action.key).toBe('super');
    expect(action.to).toBe('/tools/super-contribution');
  });

  it('falls back to FIRE planning when everything looks solid', () => {
    const action = nextAction({ savingsBalance: 50000, superBalance: 100000, debts: [] });
    expect(action.key).toBe('default');
    expect(action.to).toBe('/tools/fire-number');
  });

  it('handles an empty/undefined profile without throwing', () => {
    expect(() => nextAction()).not.toThrow();
    expect(nextAction().key).toBe('savings'); // no savings → emergency fund
  });

  it('ignores debt entries with no balance', () => {
    const action = nextAction({
      savingsBalance: 50000,
      superBalance: 100000,
      debts: [{ label: 'Paid off', balance: 0, rate: 0 }],
    });
    expect(action.key).toBe('default');
  });
});
