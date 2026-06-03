import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Card, Input, PageHeader, PageShell } from '../components/ui';

const categories = ['All', 'Budgeting', 'Tax', 'Loans', 'Saving', 'Super', 'Planning'];

const tools = [
  {
    title: 'Income Tax Calculator',
    description: 'Estimate annual Australian income tax, Medicare levy, and net pay.',
    path: '/tools/tax-calculator',
    category: 'Tax',
  },
  {
    title: 'Budget Planner',
    description: 'Plan monthly income, expenses, and spending categories.',
    path: '/tools/budget-planner',
    category: 'Budgeting',
    bestStart: true,
  },
  {
    title: 'Savings Goal Calculator',
    description: 'Work out how long a savings target may take with contributions and interest.',
    path: '/tools/savings-goal',
    category: 'Saving',
    bestStart: true,
  },
  {
    title: 'Loan Repayment Calculator',
    description: 'Calculate monthly repayments, total interest, and total amount payable.',
    path: '/tools/loan-repayment',
    category: 'Loans',
  },
  {
    title: 'Compound Interest Calculator',
    description: 'See how savings can grow with compounding and regular contributions.',
    path: '/tools/compound-interest',
    category: 'Saving',
  },
  {
    title: 'Mortgage Calculator',
    description: 'Compare home loan repayments, interest, and payment frequencies.',
    path: '/tools/mortgage',
    category: 'Loans',
  },
  {
    title: 'Super Contribution Calculator',
    description: 'Project superannuation balances with employer and personal contributions.',
    path: '/tools/super-contribution',
    category: 'Super',
  },
  {
    title: 'GST Calculator',
    description: 'Add or remove Australian GST from an amount.',
    path: '/tools/gst',
    category: 'Tax',
  },
  {
    title: 'Salary Calculator',
    description: 'Estimate take-home pay from gross salary, tax, Medicare, and super.',
    path: '/tools/salary',
    category: 'Tax',
  },
  {
    title: 'Emergency Fund Calculator',
    description: 'Estimate a practical cash buffer for unexpected expenses.',
    path: '/tools/emergency-fund',
    category: 'Planning',
  },
];

const Tools = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const filteredTools = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return tools.filter((tool) => {
      const matchesCategory = activeCategory === 'All' || tool.category === activeCategory;
      const matchesSearch = !query ||
        tool.title.toLowerCase().includes(query) ||
        tool.description.toLowerCase().includes(query) ||
        tool.category.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  return (
    <PageShell>
      <PageHeader
        kicker="Tools"
        title={<><span>Financial</span><br />calculators.</>}
        description="Free calculators for tax, budgeting, loans, super, and more — built for Australian rules and rates."
      >
        <Card className="p-5 bg-surface-soft/70">
          <p className="text-xs font-bold uppercase tracking-widest text-text-dim mb-2">
            Start here
          </p>
          <p className="text-sm text-text-muted leading-relaxed">
            New to money planning? Try a card marked <span className="font-semibold text-accent">Best place to start</span> first.
          </p>
        </Card>
      </PageHeader>

      <section className="pb-32">
        <div className="mb-10 reveal-text stagger-1">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-xl">
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search calculators, categories, or goals…"
                aria-label="Search calculators"
                className="pr-20"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-bold text-text-dim transition-colors hover:text-accent focus:outline-none focus:ring-4 focus:ring-accent/10"
                >
                  Clear
                </button>
              )}
            </div>

            <p className="text-sm text-text-dim">
              Showing <span className="font-semibold text-text-primary">{filteredTools.length}</span> of {tools.length} calculators
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-2" aria-label="Filter calculators by category">
            {categories.map((category) => {
              const isActive = activeCategory === category;

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all focus:outline-none focus:ring-4 focus:ring-accent/10 ${
                    isActive
                      ? 'border-accent bg-accent text-white shadow-glow'
                      : 'border-line-soft bg-surface-raised text-text-muted hover:border-accent/40 hover:bg-surface-soft hover:text-accent'
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>

        {filteredTools.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 reveal-text stagger-2">
            {filteredTools.map((tool) => (
              <Link
                key={tool.path}
                to={tool.path}
                className="group block rounded-2xl focus:outline-none focus:ring-4 focus:ring-accent/15"
              >
                <Card className="flex min-h-[220px] flex-col p-6 hover:-translate-y-1 hover:border-accent/40 hover:bg-surface-soft hover:shadow-minimal-lg">
                  <div className="mb-5 flex flex-wrap items-start gap-2">
                    <Badge>{tool.category}</Badge>
                    {tool.bestStart && <Badge variant="accent">Best place to start</Badge>}
                  </div>

                  <h2 className="mb-3 text-xl font-semibold tracking-tight text-text-primary transition-colors group-hover:text-accent">
                    {tool.title}
                  </h2>
                  <p className="mb-6 flex-1 text-sm leading-relaxed text-text-muted">
                    {tool.description}
                  </p>

                  <div className="flex items-center justify-between border-t border-line-soft pt-4">
                    <span className="text-xs font-bold uppercase tracking-widest text-accent">
                      Open calculator
                    </span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-line-soft text-accent transition-all group-hover:border-accent group-hover:bg-accent group-hover:text-white" aria-hidden="true">
                      →
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="py-20 text-center reveal-text">
            <p className="text-text-muted font-serif italic">
              No calculators match your search. Try a different term or category.
            </p>
          </Card>
        )}
      </section>
    </PageShell>
  );
};

export default Tools;
