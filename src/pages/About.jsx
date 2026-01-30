const About = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-100/80 via-purple-50/60 to-indigo-100/80 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800" />
        <div className="container-custom relative">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold heading-gradient mb-6">About Caplet</h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Free financial education covering everything money-related. Trading, investing, budgeting, tax, and more. Australian-focused.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto">
            <div className="mb-16">
              <h2 className="text-3xl font-bold heading-gradient mb-6">Our Platform</h2>
              <div className="prose prose-lg max-w-none">
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Caplet is a free financial education platform for Australians. We cover everything money-related: trading strategies, investing, budgeting, superannuation, tax, loans, economics, business finance, and more.
                </p>
                <p className="text-gray-600 dark:text-gray-300">
                  All content is tailored to Australian markets, regulations, and financial systems. From day trading to retirement planning - we've got you covered.
                </p>
              </div>
            </div>

            <div>
              <h2 className="text-3xl font-bold heading-gradient mb-6">What We Cover</h2>
              <div className="card-fun p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Topics</h3>
                    <ul className="text-gray-600 dark:text-gray-300 space-y-2">
                      <li>• Trading strategies & day trading</li>
                      <li>• Investing & portfolio management</li>
                      <li>• Budgeting & money management</li>
                      <li>• Superannuation & retirement</li>
                      <li>• Tax, loans, economics</li>
                      <li>• Business finance</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Approach</h3>
                    <ul className="text-gray-600 dark:text-gray-300 space-y-2">
                      <li>• Free & accessible</li>
                      <li>• Australian-focused</li>
                      <li>• Simple explanations</li>
                      <li>• Evidence-based</li>
                      <li>• Practical & actionable</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
