export const knowledgeLevels = [
  {
    value: 'beginner',
    title: 'I’m just getting started',
    description: 'Build confidence with everyday money language, simple budgets, and core habits.',
    icon: '🌱',
  },
  {
    value: 'intermediate',
    title: 'I know the basics',
    description: 'Sharpen decisions around saving, investing, tax, debt, and long-term planning.',
    icon: '📈',
  },
  {
    value: 'advanced',
    title: 'I’m ready to go deeper',
    description: 'Explore strategy, optimisation, and scenario planning with a more technical path.',
    icon: '🧠',
  },
];

export const goalOptions = [
  {
    value: 'budgeting',
    title: 'Create a budget',
    description: 'Track spending, spot leaks, and make room for what matters.',
    icon: '🧾',
  },
  {
    value: 'emergency-fund',
    title: 'Build an emergency fund',
    description: 'Set a safety buffer that fits your income and expenses.',
    icon: '🛟',
  },
  {
    value: 'debt',
    title: 'Understand debt',
    description: 'Compare repayment strategies and borrowing trade-offs.',
    icon: '💳',
  },
  {
    value: 'investing',
    title: 'Start investing',
    description: 'Learn risk, diversification, compounding, and beginner-friendly concepts.',
    icon: '🌿',
  },
  {
    value: 'super',
    title: 'Plan for retirement',
    description: 'Understand superannuation, contributions, and long-term planning.',
    icon: '🏦',
  },
  {
    value: 'tax',
    title: 'Feel tax-ready',
    description: 'Get comfortable with income, deductions, and Australian tax basics.',
    icon: '🧮',
  },
];

export const incomeRanges = [
  {
    value: 'under-2k',
    title: 'Under $2k / month',
    description: 'Keep plans realistic while income is tight or variable.',
  },
  {
    value: '2k-4k',
    title: '$2k–$4k / month',
    description: 'Balance essentials, saving, and learning momentum.',
  },
  {
    value: '4k-7k',
    title: '$4k–$7k / month',
    description: 'Start optimising surplus and medium-term goals.',
  },
  {
    value: '7k-10k',
    title: '$7k–$10k / month',
    description: 'Coordinate saving, investing, tax, and lifestyle trade-offs.',
  },
  {
    value: 'over-10k',
    title: 'Over $10k / month',
    description: 'Focus on strategy, tax awareness, and long-range planning.',
  },
  {
    value: 'prefer-not-to-say',
    title: 'Prefer not to say',
    description: 'Personalise your path without sharing income.',
  },
];

const recommendationCopy = {
  budgeting: 'Start with Budgeting 101 and use the Budget Planner to turn your choices into a weekly rhythm.',
  'emergency-fund': 'Pair Budgeting 101 with the Emergency Fund calculator to set a practical first buffer.',
  debt: 'Review loan repayment concepts early so interest costs and repayment timing feel less abstract.',
  investing: 'After the basics, move into investing and compound interest lessons to understand risk and growth.',
  super: 'Prioritise superannuation lessons once budgeting feels stable so retirement planning becomes less distant.',
  tax: 'Use the tax and salary tools alongside lessons so deductions, brackets, and take-home pay connect.',
};

export function getRecommendedActions({ knowledgeLevel, goals = [], incomeRange } = {}) {
  const actions = [];

  if (knowledgeLevel === 'beginner') {
    actions.push('Begin with short lessons and tools rather than trying to master every concept at once.');
  } else if (knowledgeLevel === 'intermediate') {
    actions.push('Use Caplet’s calculators to test assumptions after each lesson and make the learning concrete.');
  } else if (knowledgeLevel === 'advanced') {
    actions.push('Jump into scenario planning and compare strategies across tax, super, investing, and debt.');
  }

  goals.slice(0, 3).forEach((goal) => {
    if (recommendationCopy[goal]) actions.push(recommendationCopy[goal]);
  });

  if (incomeRange === 'under-2k' || incomeRange === '2k-4k') {
    actions.push('Keep the first milestone small: one spending insight, one saving habit, and one lesson each week.');
  } else if (incomeRange === 'prefer-not-to-say') {
    actions.push('You can still personalise lessons by goals first, then revisit income details when it feels useful.');
  } else if (incomeRange) {
    actions.push('Use your income range to pressure-test how much can go toward goals before lifestyle creep takes over.');
  }

  return [...new Set(actions)].slice(0, 4);
}
