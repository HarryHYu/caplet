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
              CapletEdu delivers structured financial education for high school students and beyond, 
              tailored specifically to the Australian context.
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
                  CapletEdu is the educational branch of Caplet, operating at capletedu.org and focusing on structured financial education 
                  for high school students and beyond. Our lessons are tailored specifically to the Australian context and designed for 
                  integration into school curricula.
                </p>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  CapletEdu is currently used for lessons within the Capital Finance Club and is being integrated into the 
                  Knox Grammar School Commerce Department for Years 9–10, serving approximately 400 students. Coursework is designed 
                  in collaboration with Knox commerce staff, with plans to expand to other schools and potentially into preparatory 
                  school settings.
                </p>
                <p className="text-gray-600 dark:text-gray-300">
                  CapletEdu also sponsors the Caplet Challenge, an Australian case competition owned by the Capital Finance Society. 
                  While currently free, future development may include SaaS offerings for schools and large institutions.
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
                      <li>• Budgeting & money management</li>
                      <li>• Tax & superannuation basics</li>
                      <li>• Investing fundamentals</li>
                      <li>• Business finance</li>
                      <li>• Economics & financial systems</li>
                      <li>• Australian market context</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Approach</h3>
                    <ul className="text-gray-600 dark:text-gray-300 space-y-2">
                      <li>• Structured curriculum design</li>
                      <li>• School-integrated learning</li>
                      <li>• Australian context & examples</li>
                      <li>• Academic-grade content</li>
                      <li>• Collaboration with educators</li>
                      <li>• Institution-focused delivery</li>
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
