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
    actionTitle: 'Try a synthetic savings scenario',
    actionDescription: 'Use made-up numbers to see how a regular contribution changes a goal timeline.',
    actionLabel: 'Try a savings calculator',
    to: '/money/tools/savings-goal',
  },
  {
    id: 'inflation',
    label: 'Check the economy',
    description: 'Understand an Australian indicator and try a separate hypothetical example.',
    actionTitle: 'Understand inflation and everyday prices',
    actionDescription: 'Read a dated, provenance-labelled ABS observation, then test a clearly labelled hypothetical rate.',
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
