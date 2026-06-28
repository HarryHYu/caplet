/**
 * Pick ONE concrete next action for a user based on their financial profile.
 *
 * Pure function (no React, no imports) so it's trivially unit-testable and
 * encodes the product logic in one place. Rules are evaluated in priority
 * order and the first match wins.
 *
 * `profile` fields may be null (a brand-new user). Returns:
 *   { key, title, rationale, to }
 *
 * NOTE: the `to` targets pass forward-compatible query params (e.g.
 * `?balance=&apr=`) that the calculators DO NOT read yet — calculator
 * prefill-from-profile is intentionally a later build. They're harmless
 * hints today, mirroring the existing `?slide=` convention in LessonPlayer.
 */
export function nextAction(profile = {}) {
  const {
    savingsBalance = null,
    superBalance = null,
    debts = [],
  } = profile || {};

  const debtList = Array.isArray(debts) ? debts : [];
  const totalDebt = debtList.reduce((sum, d) => sum + (Number(d?.balance) || 0), 0);

  // 1) Has debt → pay down the highest-rate balance first.
  if (totalDebt > 0) {
    const worst = [...debtList].sort(
      (a, b) => (Number(b?.rate) || 0) - (Number(a?.rate) || 0),
    )[0];
    const balance = Math.round(Number(worst?.balance) || 0);
    const apr = Number(worst?.rate) || '';
    return {
      key: 'debt',
      title: 'Build a debt payoff plan',
      rationale:
        'You listed outstanding debt. Clearing high-interest balances is usually the highest-return move you can make.',
      to: `/tools/credit-card-payoff?balance=${balance}&apr=${apr}`,
    };
  }

  // 2) Little or no savings → start an emergency fund.
  if (savingsBalance == null || savingsBalance < 2000) {
    return {
      key: 'savings',
      title: 'Start an emergency fund',
      rationale:
        'A small cash buffer keeps a surprise expense from turning into debt. Even a few hundred dollars helps.',
      to: '/tools/emergency-fund',
    };
  }

  // 3) Low super (proxy for early career) → boost super contributions.
  if (superBalance == null || superBalance < 20000) {
    return {
      key: 'super',
      title: 'Boost your super',
      rationale:
        'Extra contributions early in your working life compound the hardest — small amounts now go a long way.',
      to: '/tools/super-contribution',
    };
  }

  // 4) Foundations look solid → plan for financial independence.
  return {
    key: 'default',
    title: 'Map your path to financial independence',
    rationale:
      'Your foundations look solid — see what reaching financial independence would actually take.',
    to: '/tools/fire-number',
  };
}
