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
    <div className="min-h-screen py-24">
      {/* Hero Section */}
      <section className="mb-20">
        <div className="container-custom">
          <div className="animate-slide-up">
            <span className="section-kicker mb-6">
              Interactive Terminals
            </span>
            <h1 className="text-5xl md:text-6xl font-extrabold text-black dark:text-white mb-8 tracking-tighter uppercase">
              Financial <br />Utility Hub.
            </h1>
            <p className="text-xl text-zinc-500 dark:text-zinc-400 max-w-2xl font-medium leading-relaxed">
              Professional-grade tools designed to help you analyze, calculate, and plan your financial sequence with absolute precision.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="pb-32">
        <div className="container-custom">
          {/* Search Bar */}
          <div className="mb-20 animate-slide-up" style={{ animationDelay: '100ms' }}>
            <div className="relative max-w-3xl">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="IDENTIFY UTILITY..."
                className="w-full px-5 py-5 pl-14 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900 text-black dark:text-white font-bold text-xs uppercase tracking-[0.2em] focus:border-brand outline-none transition-all placeholder:text-zinc-300 dark:placeholder:text-zinc-700"
              />
              <div className="absolute left-5 top-1/2 transform -translate-y-1/2 text-zinc-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-5 top-1/2 transform -translate-y-1/2 text-zinc-400 hover:text-black dark:hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Tools Grid */}
          {filteredTools.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {filteredTools.map((tool, index) => {
                const cardInner = (
                  <div className="p-10 flex flex-col flex-grow">
                    <div className="w-8 h-1 overflow-hidden bg-zinc-100 dark:bg-zinc-800 mb-8">
                      <div className="w-full h-full bg-brand origin-left transition-transform duration-500 group-hover:scale-x-50" />
                    </div>
                    <h3 className="text-xl font-extrabold text-black dark:text-white mb-4 group-hover:text-brand transition-colors leading-tight uppercase tracking-tighter">
                      {tool.title}
                    </h3>
                    <p className="text-zinc-500 dark:text-zinc-400 text-xs font-medium leading-relaxed flex-grow mb-10 line-clamp-3">
                      {tool.description}
                    </p>
                    {tool.path ? (
                      <div className="inline-flex items-center justify-between w-full text-[10px] font-bold uppercase tracking-[0.2em] text-brand border-t border-zinc-50 dark:border-zinc-900 pt-8">
                        Launch Terminal
                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center justify-center px-6 py-3 bg-zinc-50 dark:bg-zinc-900 text-zinc-400 text-[10px] font-bold uppercase tracking-widest cursor-not-allowed">
                        Status: Development
                      </div>
                    )}
                  </div>
                );

                if (tool.path) {
                  return (
                    <Link
                      key={index}
                      to={tool.path}
                      className="mesh-card p-0 group animate-slide-up bg-white dark:bg-zinc-950 border-zinc-100 dark:border-zinc-900 overflow-hidden flex flex-col"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      {cardInner}
                    </Link>
                  );
                }

                return (
                  <div
                    key={index}
                    className="mesh-card p-0 group animate-slide-up bg-white dark:bg-zinc-950 border-zinc-100 dark:border-zinc-900 overflow-hidden flex flex-col"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {cardInner}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-32 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900 animate-fade-in">
              <p className="text-zinc-500 font-extrabold text-xs uppercase tracking-[0.3em]">
                Filter Yielded Zero results
              </p>
              <p className="text-zinc-400 font-bold text-[10px] uppercase tracking-widest mt-4">
                Redefine your parameters
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Tools;

