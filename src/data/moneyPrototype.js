export const MONEY_STORAGE_KEYS = {
  onboarded: 'caplet:money:onboarded',
  intent: 'caplet:money:intent',
  inflationExperiment: 'caplet:money:inflation-experiment',
  savingsScenario: 'caplet:money:savings-scenario',
};

export const MONEY_INTENTS = [
  {
    id: 'pay',
    label: 'Understand my pay',
    description: 'Explore take-home pay, tax and super using an example.',
    actionTitle: 'See what changes take-home pay',
    actionDescription: 'Open the Australian salary calculator with an example, then change one input.',
    actionLabel: 'Try the pay calculator',
    to: '/money/tools/salary',
  },
  {
    id: 'save',
    label: 'Save for something',
    description: 'Compare how regular contributions change a goal timeline.',
    actionTitle: 'Build a private savings scenario',
    actionDescription: 'Start with sample numbers or choose to use your own figures.',
    actionLabel: 'Open My Money',
    to: '/money/my-money',
  },
  {
    id: 'inflation',
    label: 'Check the economy',
    description: 'Understand an Australian indicator and try a separate hypothetical example.',
    actionTitle: 'Understand inflation and everyday prices',
    actionDescription: 'Read a dated ABS snapshot, then test a clearly labelled hypothetical rate.',
    actionLabel: 'Understand inflation',
    to: '/money/economy/inflation',
  },
  {
    id: 'tools',
    label: 'Try a calculator',
    description: 'Find an educational tool by the question you want to explore.',
    actionTitle: 'Choose a money question to explore',
    actionDescription: 'Browse Australian calculators for pay, saving, borrowing and big decisions.',
    actionLabel: 'Browse tools',
    to: '/money/tools',
  },
];

export const CPI_SNAPSHOT = {
  value: 4.0,
  previousValue: 4.2,
  unit: '% through the year',
  referencePeriod: 'May 2026',
  previousPeriod: 'April 2026',
  released: '24 June 2026',
  verified: '13 July 2026',
  nextRelease: '29 July 2026',
  sourceLabel: 'ABS Consumer Price Index, Australia',
  sourceUrl: 'https://www.abs.gov.au/statistics/economy/price-indexes-and-inflation/consumer-price-index-australia/may-2026',
  methodologyUrl: 'https://www.abs.gov.au/methodologies/consumer-price-index-australia-methodology/may-2026',
};

export function readMoneyStorage(key, fallback = null) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function writeMoneyStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Prototype state remains usable for the current session.
  }
}

export function removeMoneyStorage(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Nothing else is required when storage is unavailable.
  }
}

export function calculateSavingsTimeline({ target, current, monthly }) {
  const targetAmount = Number(target);
  const currentAmount = Number(current);
  const monthlyAmount = Number(monthly);
  const remaining = Math.max(0, targetAmount - currentAmount);
  const months = remaining === 0 ? 0 : monthlyAmount > 0 ? Math.ceil(remaining / monthlyAmount) : null;
  return { target: targetAmount, current: currentAmount, monthly: monthlyAmount, remaining, months };
}

