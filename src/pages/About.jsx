const About = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900 py-16">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
              About Caplet
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Free financial education covering everything money-related. 
              Trading, investing, budgeting, tax, and more. Australian-focused.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto">
            {/* Platform Summary */}
            <div className="mb-16">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                Our Platform
              </h2>
              <div className="prose prose-lg max-w-none">
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Caplet is a free financial education platform for Australians. We cover everything money-related: 
                  trading strategies, investing, budgeting, superannuation, tax, loans, economics, business finance, and more.
                </p>
                <p className="text-gray-600 dark:text-gray-300">
                  All content is tailored to Australian markets, regulations, and financial systems. 
                  From day trading to retirement planning - we've got you covered.
                </p>
              </div>
            </div>

            {/* What We Cover */}
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                What We Cover
              </h2>
              <div className="bg-gray-50 dark:bg-gray-800 p-8 rounded-lg">
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
