import { Link } from 'react-router-dom';

const Footer = () => {
  return (
      <footer className="bg-white/60 dark:bg-gray-900/80 backdrop-blur-sm border-t border-gray-200/50 dark:border-gray-700/50">
      <div className="container-custom py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <img src="/logo.png" alt="Caplet" className="h-8 w-auto" />
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">Caplet</span>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-4 max-w-md text-sm leading-relaxed">
              Empowering Australians with free, accessible financial education to bridge the financial literacy gap.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Quick Links</h3>
            <ul className="space-y-3">
              {[
                { to: '/about', label: 'About' },
                { to: '/mission', label: 'Mission' },
                { to: '/faq', label: 'FAQ' },
                { to: '/contact', label: 'Contact' },
              ].map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200 inline-block hover:translate-x-1">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

        </div>
        <div className="mt-10 pt-6 border-t border-gray-200/50 dark:border-gray-700/50">
          <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-500 dark:text-gray-400 gap-2">
            <p>© {new Date().getFullYear()} Caplet. All rights reserved.</p>
            <Link to="/terms" className="font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200">
              Terms and Services
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
