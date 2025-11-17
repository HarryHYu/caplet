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
              We're on a mission to bridge the financial literacy gap in Australia through 
              accessible, free education for everyone.
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
                  Caplet is an educational platform designed to address the critical financial literacy gap 
                  in Australia. We believe that financial education should be accessible to everyone, 
                  regardless of their background or circumstances.
                </p>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Our platform provides free, comprehensive resources covering essential financial topics 
                  including budgeting, superannuation, tax, loans, and basic economics - all tailored 
                  specifically to the Australian financial landscape.
                </p>
                <p className="text-gray-600 dark:text-gray-300">
                  Think of us as Khan Academy for personal finance, but with a laser focus on 
                  Australian financial systems and regulations.
                </p>
              </div>
            </div>

            {/* Financial Literacy Gap */}
            <div className="mb-16">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                The Financial Literacy Gap in Australia
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg border-l-4 border-red-500 dark:border-red-400">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">The Problem</h3>
                  <ul className="text-gray-600 dark:text-gray-300 space-y-2">
                    <li>• Many Australians lack basic financial knowledge</li>
                    <li>• Young people struggle with budgeting and saving</li>
                    <li>• Elderly population vulnerable to financial scams</li>
                    <li>• Complex financial products confuse consumers</li>
                    <li>• Limited access to quality financial education</li>
                  </ul>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border-l-4 border-blue-500 dark:border-blue-400">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">The Impact</h3>
                  <ul className="text-gray-600 dark:text-gray-300 space-y-2">
                    <li>• Poor financial decisions lead to debt</li>
                    <li>• Retirement savings inadequacy</li>
                    <li>• Increased financial stress and anxiety</li>
                    <li>• Reduced economic participation</li>
                    <li>• Generational wealth gaps persist</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Why It Matters */}
            <div className="mb-16">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                Why Financial Literacy Matters
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Personal Wellbeing</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    Financial literacy leads to better money management, reduced stress, and improved quality of life.
                  </p>
                </div>

                <div className="text-center p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Economic Participation</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    Empowered individuals contribute more effectively to the economy and make informed decisions.
                  </p>
                </div>

                <div className="text-center p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Financial Security</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    Knowledge protects against scams, poor investments, and financial exploitation.
                  </p>
                </div>
              </div>
            </div>

            {/* Our Approach */}
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                Our Approach
              </h2>
              <div className="bg-gray-50 dark:bg-gray-800 p-8 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">What We Do</h3>
                    <ul className="text-gray-600 dark:text-gray-300 space-y-3">
                      <li className="flex items-start">
                        <span className="text-blue-600 dark:text-blue-400 mr-2">✓</span>
                        Provide free, accessible financial education
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-600 mr-2">✓</span>
                        Focus on Australian financial systems
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-600 mr-2">✓</span>
                        Create simple, clear explanations
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-600 mr-2">✓</span>
                        Cover essential financial topics
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Our Values</h3>
                    <ul className="text-gray-600 dark:text-gray-300 space-y-3">
                      <li className="flex items-start">
                        <span className="text-green-600 dark:text-green-400 mr-2">✓</span>
                        Accessibility for all Australians
                      </li>
                      <li className="flex items-start">
                        <span className="text-green-600 mr-2">✓</span>
                        Evidence-based content
                      </li>
                      <li className="flex items-start">
                        <span className="text-green-600 mr-2">✓</span>
                        Practical, actionable advice
                      </li>
                      <li className="flex items-start">
                        <span className="text-green-600 mr-2">✓</span>
                        Continuous improvement
                      </li>
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
