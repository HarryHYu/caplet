import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-100/80 via-purple-50/60 to-indigo-100/80 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800" />
        <div className="container-custom relative">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              <span className="text-gray-900 dark:text-white">Financial Education for </span>
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">Every Australian</span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-10 max-w-3xl mx-auto leading-relaxed">
              Everything money-related. Trading, investing, budgeting, tax, strategies, and more. 
              Free. Australian-focused.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/courses" className="btn-primary text-lg px-8 py-3.5 inline-flex items-center justify-center gap-2">
                📚 Browse Courses
              </Link>
              <Link to="/about" className="btn-secondary text-lg px-8 py-3.5 inline-flex items-center justify-center gap-2">
                Learn About Us
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container-custom">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold heading-gradient mb-4">
              Why It Matters
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Financial knowledge = better decisions. Better decisions = better outcomes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: '📖', title: 'Free', desc: 'All content, courses, and tools are completely free.', gradient: 'from-blue-400 to-blue-600' },
              { icon: '✅', title: 'Comprehensive', desc: 'Trading to tax. Investing to budgeting. Everything money-related with Australian context.', gradient: 'from-emerald-400 to-emerald-600' },
              { icon: '⚡', title: 'Accessible', desc: 'Clear, simple explanations. No jargon. For everyone.', gradient: 'from-purple-400 to-purple-600' },
            ].map((item) => (
              <div key={item.title} className="card-fun text-center p-8 hover:scale-[1.02]">
                <div className={`w-20 h-20 bg-gradient-to-br ${item.gradient} rounded-2xl flex items-center justify-center mx-auto mb-5 text-4xl shadow-lg`}>
                  {item.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{item.title}</h3>
                <p className="text-gray-600 dark:text-gray-300">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500 dark:from-blue-600 dark:via-purple-600 dark:to-indigo-600">
        <div className="container-custom text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Level Up?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Start learning today. Take control of your financial future.
          </p>
          <Link to="/courses" className="inline-flex items-center gap-2 bg-white text-blue-600 font-bold py-3.5 px-8 rounded-xl hover:bg-gray-100 shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-105">
            📚 Browse Courses
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
