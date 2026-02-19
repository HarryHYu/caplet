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
      {/* Hero Section */}
      <section className="mb-24">
        <div className="container-custom">
          <div className="reveal-text">
            <span className="section-kicker mb-8">
              Utility Suite
            </span>
            <h1 className="text-6xl lg:text-8xl mb-10">
              Technical <br />Calculators.
            </h1>
            <p className="text-xl text-text-muted max-w-2xl font-serif italic leading-relaxed">
              Proprietary tools for tax estimation, asset projection, and structural budget analysis.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="pb-32">
        <div className="container-custom">
          {/* Search Bar */}
          <div className="mb-24 reveal-text stagger-1">
            <div className="relative max-w-4xl">
              <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-text-dim">
                <span className="text-[10px] font-black tracking-widest uppercase">Search_</span>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="BY IDENTIFIER OR FUNCTION"
                className="w-full px-24 py-8 bg-surface-raised border border-line-soft text-text-primary font-bold text-xs uppercase tracking-[0.4em] focus:border-accent outline-none transition-all placeholder:text-text-dim/30"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-8 top-1/2 -translate-y-1/2 text-text-dim hover:text-accent transition-colors"
                >
                  [ CLR ]
                </button>
              )}
            </div>
          </div>

          {/* Tools Grid */}
          {filteredTools.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1.5 bg-line-soft border border-line-soft reveal-text stagger-2">
              {filteredTools.map((tool, index) => (
                <Link
                  key={index}
                  to={tool.path || '#'}
                  className="group bg-surface-body p-12 lg:p-16 relative overflow-hidden flex flex-col min-h-[400px] transition-all hover:bg-surface-soft"
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-[0.03] grid-technical !bg-[size:25px_25px] transition-opacity" />

                  <div className="relative z-10 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-16">
                      <span className="text-[9px] font-black uppercase tracking-[0.4em] text-text-dim">0{index + 1} / UTILITY</span>
                      <div className="w-10 h-10 border border-line-soft flex items-center justify-center text-text-dim group-hover:text-accent group-hover:border-accent transition-all">
                        →
                      </div>
                    </div>

                    <h3 className="text-3xl font-serif italic text-text-primary mb-6 group-hover:text-accent transition-colors">
                      {tool.title}.
                    </h3>
                    <p className="text-sm font-medium text-text-muted leading-relaxed line-clamp-3 mb-10">
                      {tool.description}
                    </p>

                    <div className="mt-auto pt-8 border-t border-line-soft flex items-end justify-between">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-text-dim mb-1">Accessibility</p>
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${tool.path ? 'text-accent' : 'text-text-muted'}`}>
                          {tool.path ? 'Active Terminal' : 'Development'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-dim group-hover:text-text-primary transition-colors">Invoke Module</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-40 bg-surface-raised border border-line-soft reveal-text">
              <div className="mb-8 opacity-20">
                <span className="text-6xl font-serif italic text-text-dim">?</span>
              </div>
              <p className="text-text-dim font-black text-xs uppercase tracking-[0.4em]">
                Registry Query Null
              </p>
              <p className="text-text-muted font-serif italic text-sm mt-4">
                No tools found for the requested identifier.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};


export default Tools;

