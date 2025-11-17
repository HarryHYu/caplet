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
              Free financial education for every Australian. Everything money-related. 
              Trading to tax. Australian-focused.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto">
            {/* What We Do */}
            <div className="mb-16">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                What We Do
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    Platform Features
                  </h3>
                  <ul className="text-gray-600 dark:text-gray-300 space-y-2">
                    <li>• Free courses & lessons</li>
                    <li>• Interactive calculators & tools</li>
                    <li>• Progress tracking</li>
                    <li>• Mobile-responsive</li>
                    <li>• Evidence-based content</li>
                  </ul>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    Topics Covered
                  </h3>
                  <ul className="text-gray-600 dark:text-gray-300 space-y-2">
                    <li>• Trading & day trading strategies</li>
                    <li>• Investing & portfolio management</li>
                    <li>• Budgeting & money management</li>
                    <li>• Superannuation & retirement</li>
                    <li>• Tax, loans, economics, business</li>
                    <li>• All with Australian context</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Vision */}
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                Our Vision
              </h2>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 p-8 rounded-lg">
                <p className="text-lg text-gray-700 dark:text-gray-300 text-center max-w-3xl mx-auto">
                  A financially literate Australia where everyone has the knowledge and confidence 
                  to make informed financial decisions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Mission;
