import { useState } from 'react';
import { Link } from 'react-router-dom';

const tools = [
  {
    title: 'Income Tax Calculator',
    description: 'Estimate your annual Australian income tax, Medicare levy, and net pay.',
    path: '/tools/tax-calculator',
  },
  {
    title: 'Budget Planner',
    description: 'Plan your monthly budget and track spending across different categories.',
    path: '/tools/budget-planner',
  },
  {
    title: 'Savings Goal Calculator',
    description: 'Calculate how long it will take to reach your savings goal with contributions and interest.',
    path: '/tools/savings-goal',
  },
  {
    title: 'Loan Repayment Calculator',
    description: 'Calculate monthly loan repayments, total interest, and total amount payable.',
    path: '/tools/loan-repayment',
  },
  {
    title: 'Compound Interest Calculator',
    description: 'See how your money grows with compound interest and regular contributions.',
    path: '/tools/compound-interest',
  },
  {
    title: 'Mortgage Calculator',
    description: 'Calculate home loan repayments, total interest, and explore different payment frequencies.',
    path: '/tools/mortgage',
  },
  {
    title: 'Super Contribution Calculator',
    description: 'Project your superannuation balance with employer and personal contributions.',
    path: '/tools/super-contribution',
  },
  {
    title: 'GST Calculator',
    description: 'Add or remove GST (10%) from amounts for Australian Goods and Services Tax calculations.',
    path: '/tools/gst',
  },
  {
    title: 'Salary Calculator',
    description: 'Calculate your take-home pay from gross salary, including tax, Medicare, and superannuation.',
    path: '/tools/salary',
  },
  {
    title: 'Emergency Fund Calculator',
    description: 'Calculate how much you should have in your emergency fund to cover unexpected expenses.',
    path: '/tools/emergency-fund',
  }
];

const Tools = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTools = tools.filter(tool => {
    const query = searchQuery.toLowerCase();
    return tool.title.toLowerCase().includes(query) ||
      tool.description.toLowerCase().includes(query);
  });

  return (
    <div className="min-h-screen bg-surface-body py-32 selection:bg-accent selection:text-white">
      <section className="mb-24">
        <div className="container-custom">
          <div className="reveal-text">
            <span className="section-kicker mb-8">Tools</span>
            <h1 className="text-6xl lg:text-8xl mb-10">
              Financial <br />calculators.
            </h1>
            <p className="text-xl text-text-muted max-w-2xl font-serif italic leading-relaxed">
              Free calculators for tax, budgeting, loans, super, and more — built for Australian rules and rates.
            </p>
          </div>
        </div>
      </section>

      <section className="pb-32">
        <div className="container-custom">
          <div className="mb-16 reveal-text stagger-1">
            <div className="relative max-w-xl">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search calculators…"
                className="w-full px-6 py-4 bg-surface-raised border border-line-soft text-text-primary text-sm focus:border-accent outline-none transition-all placeholder:text-text-dim"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-text-dim hover:text-accent transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {filteredTools.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1.5 bg-line-soft border border-line-soft reveal-text stagger-2">
              {filteredTools.map((tool) => (
                <Link
                  key={tool.path}
                  to={tool.path}
                  className="group bg-surface-body p-12 lg:p-14 relative overflow-hidden flex flex-col min-h-[320px] transition-all hover:bg-surface-soft"
                >
                  <h3 className="text-2xl font-serif italic text-text-primary mb-4 group-hover:text-accent transition-colors">
                    {tool.title}
                  </h3>
                  <p className="text-sm text-text-muted leading-relaxed line-clamp-3 mb-8 flex-1">
                    {tool.description}
                  </p>
                  <span className="text-xs font-bold uppercase tracking-widest text-accent">
                    Open calculator →
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-24 bg-surface-raised border border-line-soft reveal-text">
              <p className="text-text-muted font-serif italic">
                No calculators match your search. Try a different term.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Tools;
