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
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-100/80 via-purple-50/60 to-indigo-100/80 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800" />
        <div className="container-custom relative">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold heading-gradient mb-6">🛠️ Financial Tools</h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Practical tools to help you manage your finances, plan for the future, and make informed financial decisions.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16">
        <div className="container-custom">
          <div className="max-w-6xl mx-auto">
            {/* Search Bar */}
            <div className="mb-8">
              <div className="relative max-w-2xl mx-auto">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tools by name or description..."
                  className="w-full px-4 py-3 pl-12 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                />
                <svg
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Tools Grid */}
            {filteredTools.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTools.map((tool, index) => (
                  <div key={index} className="card-fun p-6 flex flex-col hover:scale-[1.02]">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{tool.title}</h3>
                    <p className="text-gray-600 dark:text-gray-300 flex-grow mb-6">{tool.description}</p>
                    {tool.path ? (
                      <Link to={tool.path} className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold hover:from-blue-600 hover:to-purple-600 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105">
                        ✨ Open Tool
                      </Link>
                    ) : (
                      <button disabled className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300 cursor-not-allowed font-medium">
                        Coming Soon
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="card-fun text-center py-16">
                <div className="text-5xl mb-4">🔍</div>
                <p className="text-gray-600 dark:text-gray-300 text-lg font-medium mb-2">No tools found matching "{searchQuery}"</p>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Try a different search term</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Tools;

