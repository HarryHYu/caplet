import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useFeatureFlags } from '../contexts/FeatureFlagContext';
import { canAccessMoneyRoute } from '../config/productNavigation';
import { useReveal } from '../lib/useReveal';
import ToolCard from '../components/ToolCard';

const tools = [
  {
    title: 'Income Tax Calculator',
    description: 'Estimate your annual Australian income tax, Medicare levy, and net pay.',
    path: '/money/tools/tax-calculator',
    category: 'Tax & Income',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
      </svg>
    ),
  },
  {
    title: 'Salary Calculator',
    description: 'Calculate your take-home pay from gross salary, including tax, Medicare, and super.',
    path: '/money/tools/salary',
    category: 'Tax & Income',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    title: 'GST Calculator',
    description: 'Add or remove GST (10%) from amounts for Australian Goods and Services Tax calculations.',
    path: '/money/tools/gst',
    category: 'Tax & Income',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    title: 'Budget Planner',
    description: 'Plan your monthly budget and track spending across different categories.',
    path: '/money/tools/budget-planner',
    category: 'Budgeting',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  {
    title: 'Emergency Fund Calculator',
    description: 'Calculate how much you should have in your emergency fund to cover unexpected expenses.',
    path: '/money/tools/emergency-fund',
    category: 'Budgeting',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    title: 'Savings Goal Calculator',
    description: 'Calculate how long it takes to reach your savings goal with contributions and interest.',
    path: '/money/tools/savings-goal',
    category: 'Savings & Growth',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  {
    title: 'Compound Interest Calculator',
    description: 'See how your money grows with compound interest and regular contributions over time.',
    path: '/money/tools/compound-interest',
    category: 'Savings & Growth',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
      </svg>
    ),
  },
  {
    title: 'Super Contribution Calculator',
    description: 'Project your superannuation balance with employer and personal contributions.',
    path: '/money/tools/super-contribution',
    category: 'Savings & Growth',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: 'Loan Repayment Calculator',
    description: 'Calculate monthly loan repayments, total interest, and total amount payable.',
    path: '/money/tools/loan-repayment',
    category: 'Debt & Loans',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
  {
    title: 'Mortgage Calculator',
    description: 'Calculate home loan repayments, total interest, and explore different payment frequencies.',
    path: '/money/tools/mortgage',
    category: 'Debt & Loans',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    title: 'Credit Card Payoff',
    description: 'See exactly how long it takes to clear your balance and how much interest you can save by paying more.',
    path: '/money/tools/credit-card-payoff',
    category: 'Debt & Loans',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
  {
    title: 'Financial Twin',
    description: 'A live simulation of your finances, projected 10\u201320 years ahead as ranges of scenarios \u2014 not a single guess.',
    path: '/money/tools/financial-twin',
    category: 'Savings & Growth',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l4-6 4 3 5-8 5 6M3 21h18" />
      </svg>
    ),
  },
  {
    title: 'Debt Sequencer',
    description: 'Rank your debts by what they actually cost to carry, with HECS/HELP handled on its own terms.',
    path: '/money/tools/debt-sequencer',
    category: 'Debt & Loans',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-3-3m3 3l3-3" />
      </svg>
    ),
  },
  {
    title: 'Debt-to-Income Ratio',
    description: 'Calculate your DTI ratio, the first thing lenders check before approving any loan.',
    path: '/money/tools/debt-to-income',
    category: 'Debt & Loans',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    title: 'Capital Gains Estimator',
    description: 'Estimate CGT on shares, property, or other assets under Australian tax rules including the 50% discount.',
    path: '/money/tools/capital-gains',
    category: 'Tax & Income',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  {
    title: 'Inflation Calculator',
    description: 'See how inflation erodes purchasing power over time, or how much something will cost in the future.',
    path: '/money/tools/inflation',
    category: 'Savings & Growth',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: 'Rule of 72',
    description: 'Find out how long it takes to double your money at a given rate, or what rate you need to hit a target.',
    path: '/money/tools/rule-of-72',
    category: 'Savings & Growth',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
  {
    title: 'Net Worth Calculator',
    description: 'Add up all your assets and liabilities to find your true net worth and your debt-to-asset ratio.',
    path: '/money/tools/net-worth',
    category: 'Wealth & Investing',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
      </svg>
    ),
  },
  {
    title: 'ROI Calculator',
    description: 'Calculate total return on investment and annualised CAGR for any asset (shares, property, business, or otherwise).',
    path: '/money/tools/roi',
    category: 'Wealth & Investing',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    title: 'FIRE Number Calculator',
    description: 'Calculate how much you need to retire early and how long it will take you to get there.',
    path: '/money/tools/fire-number',
    category: 'Wealth & Investing',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
      </svg>
    ),
  },
  {
    title: 'Rent vs Buy Calculator',
    description: 'Compare the true total cost of renting versus buying a home over any time horizon.',
    path: '/money/tools/rent-vs-buy',
    category: 'Property',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    title: 'Break-Even Calculator',
    description: 'Find how many units you need to sell to cover costs and what it takes to hit a profit target.',
    path: '/money/tools/break-even',
    category: 'Business',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
];

const categories = ['Tax & Income', 'Budgeting', 'Savings & Growth', 'Debt & Loans', 'Wealth & Investing', 'Property', 'Business'];

const FinancialTools = () => {
  useReveal();
  const { isAuthenticated } = useAuth();
  const { loading: featureFlagsLoading, isEnabled } = useFeatureFlags();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const availableTools = tools.filter((tool) => canAccessMoneyRoute(tool.path, {
    isAuthenticated,
    featureFlagsLoading,
    isFeatureEnabled: isEnabled,
  }));

  const filteredTools = availableTools.filter(tool => {
    const query = searchQuery.toLowerCase();
    const matchesQuery = tool.title.toLowerCase().includes(query) ||
      tool.description.toLowerCase().includes(query) ||
      tool.category.toLowerCase().includes(query);
    const matchesCategory = selectedCategory === 'All' || tool.category === selectedCategory;
    return matchesQuery && matchesCategory;
  });

  const isFiltering = searchQuery.trim().length > 0 || selectedCategory !== 'All';
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
  };

  return (
    <div className="min-h-screen bg-surface-body py-32 selection:bg-accent selection:text-white">
      <div className="container-custom">

        {/* Header */}
        <header className="mb-16 reveal">
          <span className="font-hand text-accent text-xl mb-6 block">Your money toolkit</span>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <h1 className="font-display font-extrabold tracking-tight text-6xl lg:text-8xl mb-8">
                Financial <br />calculators.
              </h1>
              <p className="text-xl text-text-muted max-w-xl leading-relaxed">
                Free calculators for tax, budgeting, loans, super, and more, built for Australian rules and rates.
              </p>
            </div>
            <div className="shrink-0 hidden md:block">
              <div className="block-blue rounded-3xl px-8 py-6 text-center shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
                <span className="text-5xl font-display font-extrabold tracking-tight text-blue">{availableTools.length}</span>
                <p className="text-xs font-bold text-text-muted mt-1 uppercase tracking-wide">Calculators</p>
              </div>
            </div>
          </div>
        </header>

        <div className="reveal mb-12 flex flex-col gap-5 rounded-3xl block-blue p-7 md:flex-row md:items-center md:justify-between">
          <p className="max-w-3xl text-sm font-semibold leading-relaxed text-text-muted">
            These tools provide general education and scenario estimates, not personal financial advice. Inputs and assumptions can change the result.
          </p>
          <Link to="/trust#financial-education" className="shrink-0 text-sm font-bold text-accent hover:text-accent-strong">
            How financial tools are framed →
          </Link>
        </div>

        {/* Search */}
        <div className="mb-16 reveal sticky top-14 md:top-16 z-20 -mx-6 px-6 py-3 bg-surface-body/95 backdrop-blur md:static md:mx-0 md:px-0 md:py-0 md:bg-transparent">
          <div className="relative max-w-lg">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              id="financial-tool-search"
              aria-label="Search financial calculators"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search calculators…"
              className="w-full pl-11 pr-10 py-3.5 bg-surface-raised border border-line-soft text-text-primary text-sm focus:border-accent outline-none transition-all rounded-xl placeholder:text-text-dim shadow-[0_12px_30px_-26px_rgba(20,20,18,0.4)]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear calculator search"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full text-text-dim hover:text-text-primary transition-all"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2" aria-label="Filter calculators by category">
            {['All', ...categories].map((category) => {
              const selected = selectedCategory === category;
              return (
                <button
                  key={category}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setSelectedCategory(category)}
                  className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-bold transition-colors ${selected ? 'bg-accent text-white' : 'border border-line-soft bg-surface-raised text-text-muted hover:text-text-primary'}`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tool grid — searched */}
        {isFiltering ? (
          filteredTools.length > 0 ? (
            <div>
              <p className="text-sm font-bold text-text-muted mb-8">{filteredTools.length} result{filteredTools.length !== 1 ? 's' : ''}</p>
              <div className="reveal-stagger grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTools.map(tool => (
                  <ToolCard key={tool.path} tool={tool} />
                ))}
              </div>
            </div>
          ) : (
            <div className="py-24 text-center block-cream rounded-3xl shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
              <p className="text-text-primary font-display font-bold text-xl mb-3">No match found.</p>
              <button
                onClick={clearFilters}
                className="text-sm font-bold text-accent hover:text-accent-strong transition-colors"
              >
                Clear filters
              </button>
            </div>
          )
        ) : (
          /* Grouped by category */
          <div data-tour-id="tools-grid" className="space-y-16">
            {categories.map(cat => {
              const group = availableTools.filter(t => t.category === cat);
              return (
                <div key={cat}>
                  <div className="flex items-center gap-4 mb-6">
                    <h2 className="font-display font-bold tracking-tight text-lg text-text-primary">{cat}</h2>
                    <span className="block-blue text-xs font-bold text-blue rounded-full px-3 py-1">{group.length}</span>
                  </div>
                  <div className="reveal-stagger grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.map(tool => (
                      <ToolCard key={tool.path} tool={tool} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
};

export default FinancialTools;
