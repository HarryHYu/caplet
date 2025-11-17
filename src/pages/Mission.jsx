const Mission = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900 py-16">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
              Our Mission
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              To democratize comprehensive financial education and empower every Australian with 
              knowledge across all money-related topics - from trading to tax - enabling informed 
              financial decisions.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto">
            {/* Problem Overview */}
            <div className="mb-16">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                The Problem We're Solving
              </h2>
              <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 dark:border-red-400 p-6 rounded-r-lg">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Financial Literacy Crisis in Australia
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Current State:</h4>
                    <ul className="text-gray-600 dark:text-gray-300 space-y-2 text-sm">
                      <li>• 67% of Australians lack basic financial literacy</li>
                      <li>• Young people struggle with debt management</li>
                      <li>• Elderly vulnerable to financial scams</li>
                      <li>• Complex financial products create confusion</li>
                      <li>• Limited access to quality education</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Consequences:</h4>
                    <ul className="text-gray-600 dark:text-gray-300 space-y-2 text-sm">
                      <li>• Poor financial decisions</li>
                      <li>• Increased debt and stress</li>
                      <li>• Retirement insecurity</li>
                      <li>• Economic exclusion</li>
                      <li>• Generational wealth gaps</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Platform Solution */}
            <div className="mb-16">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                Our Solution
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    Current Platform
                  </h3>
                  <ul className="text-gray-600 dark:text-gray-300 space-y-3">
                    <li className="flex items-start">
                      <span className="text-blue-600 dark:text-blue-400 mr-2">✓</span>
                      Free, accessible educational content
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 dark:text-blue-400 mr-2">✓</span>
                      Comprehensive coverage of all money-related topics
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">✓</span>
                      Simple, clear explanations
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">✓</span>
                      Mobile-responsive design
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">✓</span>
                      Evidence-based content
                    </li>
                  </ul>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    Topics Covered
                  </h3>
                  <ul className="text-gray-600 dark:text-gray-300 space-y-3">
                    <li className="flex items-start">
                      <span className="text-green-600 dark:text-green-400 mr-2">✓</span>
                      Trading strategies and day trading
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-600 dark:text-green-400 mr-2">✓</span>
                      Investing and portfolio management
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-600 dark:text-green-400 mr-2">✓</span>
                      Budgeting and money management
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-600 dark:text-green-400 mr-2">✓</span>
                      Superannuation and retirement planning
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-600 dark:text-green-400 mr-2">✓</span>
                      Tax, loans, economics, and business finance
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-600 dark:text-green-400 mr-2">✓</span>
                      All with Australian context and focus
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Potential Features */}
            <div className="mb-16">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                Future Features & Vision
              </h2>
              
              {/* AI Consulting */}
              <div className="mb-8 bg-purple-50 p-6 rounded-lg">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      AI-Powered Financial Consulting
                    </h3>
                    <p className="text-gray-600 mb-3">
                      Personalized financial advice and recommendations based on individual circumstances, 
                      goals, and Australian financial regulations.
                    </p>
                    <ul className="text-gray-600 text-sm space-y-1">
                      <li>• Personalized budgeting recommendations</li>
                      <li>• Investment strategy suggestions</li>
                      <li>• Tax optimization advice</li>
                      <li>• Retirement planning guidance</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Mentorship Program */}
              <div className="mb-8 bg-orange-50 p-6 rounded-lg">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Financial Mentorship Program
                    </h3>
                    <p className="text-gray-600 mb-3">
                      Connect users with experienced financial professionals and successful individuals 
                      for one-on-one guidance and support.
                    </p>
                    <ul className="text-gray-600 text-sm space-y-1">
                      <li>• Industry expert consultations</li>
                      <li>• Peer-to-peer mentoring</li>
                      <li>• Group workshops and webinars</li>
                      <li>• Accountability partnerships</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Interactive Learning */}
              <div className="bg-teal-50 p-6 rounded-lg">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Interactive Learning Tools
                    </h3>
                    <p className="text-gray-600 mb-3">
                      Engaging, gamified learning experiences that make financial education 
                      accessible and enjoyable for all ages.
                    </p>
                    <ul className="text-gray-600 text-sm space-y-1">
                      <li>• Financial simulation games</li>
                      <li>• Progress tracking and achievements</li>
                      <li>• Interactive calculators and tools</li>
                      <li>• Community challenges and competitions</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Long-term Vision */}
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                Long-term Vision
              </h2>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-8 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl font-bold text-blue-600">1M+</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Users Reached</h3>
                    <p className="text-gray-600 text-sm">
                      Help over one million Australians improve their financial literacy
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl font-bold text-green-600">50%</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Literacy Improvement</h3>
                    <p className="text-gray-600 text-sm">
                      Reduce the financial literacy gap by 50% across all demographics
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl font-bold text-purple-600">100%</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Accessibility</h3>
                    <p className="text-gray-600 text-sm">
                      Ensure financial education is accessible to every Australian
                    </p>
                  </div>
                </div>
                
                <div className="mt-8 text-center">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    Our Ultimate Goal
                  </h3>
                  <p className="text-gray-600 max-w-2xl mx-auto">
                    To create a financially literate Australia where every individual has the knowledge, 
                    confidence, and tools to make informed financial decisions that lead to better 
                    financial outcomes and improved quality of life.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Mission;
