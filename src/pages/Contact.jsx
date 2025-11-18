const Contact = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900 py-16">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
              Contact Us
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Have questions or feedback? We'd love to hear from you.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Information */}
      <section className="py-16">
        <div className="container-custom">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 shadow-sm">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Get in Touch
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                  We're here to help with any questions about financial literacy or the Caplet platform.
                </p>
              </div>

              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Email Address
                  </h3>
                  <a
                    href="mailto:contact@capletedu.org"
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-500 font-medium text-lg transition-colors duration-200 block mb-4"
                  >
                    contact@capletedu.org
                  </a>
                  <a
                    href="mailto:contact@capletedu.org?subject=Contact%20from%20Caplet"
                    className="btn-primary inline-block"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Send Email
                  </a>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mt-4">
                    We typically respond within 24-48 hours
                  </p>
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-center">
                    What We Can Help With
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-5 h-5 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-gray-600 dark:text-gray-300 text-sm">General inquiries about Caplet</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-5 h-5 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-gray-600 dark:text-gray-300 text-sm">Content suggestions and feedback</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-5 h-5 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-gray-600 dark:text-gray-300 text-sm">Technical issues or bugs</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-5 h-5 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-gray-600 dark:text-gray-300 text-sm">Partnership opportunities</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">
                      Important Note
                    </h3>
                    <p className="text-gray-600 text-sm">
                      While we're happy to help with general questions about financial literacy and our platform, 
                      we cannot provide personalized financial advice. For specific financial advice, 
                      please consult with qualified financial professionals such as financial advisors, 
                      accountants, or financial counselors.
                    </p>
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

export default Contact;
