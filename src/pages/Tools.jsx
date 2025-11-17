import { Link } from 'react-router-dom';

const tools = [
  {
    title: 'Income Tax Calculator',
    description: 'Estimate your annual Australian income tax, Medicare levy, and net pay.',
    path: '/tools/tax-calculator',
    tag: 'Core'
  },
  {
    title: 'Budget Planner',
    description: 'Plan your monthly budget and track spending across different categories.',
    path: '/tools/budget-planner',
    tag: 'Core'
  },
  {
    title: 'Savings Goal Calculator',
    description: 'Calculate how long it will take to reach your savings goal with contributions and interest.',
    path: '/tools/savings-goal',
    tag: 'Core'
  },
  {
    title: 'Loan Repayment Calculator',
    description: 'Calculate monthly loan repayments, total interest, and total amount payable.',
    path: '/tools/loan-repayment',
    tag: 'Core'
  },
  {
    title: 'Compound Interest Calculator',
    description: 'See how your money grows with compound interest and regular contributions.',
    path: '/tools/compound-interest',
    tag: 'Core'
  },
  {
    title: 'Mortgage Calculator',
    description: 'Calculate home loan repayments, total interest, and explore different payment frequencies.',
    path: '/tools/mortgage',
    tag: 'High Value'
  },
  {
    title: 'Super Contribution Calculator',
    description: 'Project your superannuation balance with employer and personal contributions.',
    path: '/tools/super-contribution',
    tag: 'High Value'
  },
  {
    title: 'GST Calculator',
    description: 'Add or remove GST (10%) from amounts for Australian Goods and Services Tax calculations.',
    path: '/tools/gst',
    tag: 'High Value'
  },
  {
    title: 'Salary Calculator',
    description: 'Calculate your take-home pay from gross salary, including tax, Medicare, and superannuation.',
    path: '/tools/salary',
    tag: 'High Value'
  },
  {
    title: 'Emergency Fund Calculator',
    description: 'Calculate how much you should have in your emergency fund to cover unexpected expenses.',
    path: '/tools/emergency-fund',
    tag: 'High Value'
  }
];

const Tools = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900 py-16">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
              Financial Tools
            </h1>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tools.map((tool, index) => (
                <div
                  key={index}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm flex flex-col"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {tool.title}
                    </h3>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      tool.tag === 'Core'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                        : tool.tag === 'High Value'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {tool.tag}
                    </span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 flex-grow">
                    {tool.description}
                  </p>
                  {tool.path ? (
                    <Link
                      to={tool.path}
                      className="mt-6 inline-flex items-center justify-center px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors"
                    >
                      Open Tool
                    </Link>
                  ) : (
                    <button
                      disabled
                      className="mt-6 inline-flex items-center justify-center px-4 py-2 rounded-lg bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300 cursor-not-allowed"
                    >
                      Coming Soon
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Tools;

