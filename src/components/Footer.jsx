import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
      <div className="container-custom py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-10 h-10 flex items-center justify-center">
                <img src="/logo.png" alt="Caplet" className="h-9 w-9 object-contain rounded-xl" />
              </span>
              <div>
                <p
                  className="text-lg font-semibold text-gray-900 dark:text-white"
                  style={{ fontFamily: "'Source Sans 3', sans-serif" }}
                >
                  Caplet
                </p>
                <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400">
                  Finance education for life
                </p>
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-4 max-w-md">
              Empowering Australians with free, accessible financial education to bridge the financial literacy gap.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/about" className="text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200">
                  About
                </Link>
              </li>
              <li>
                <Link to="/mission" className="text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200">
                  Mission
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200">
                  FAQ
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-500 dark:text-gray-400">
            <p>© {new Date().getFullYear()} Caplet. All rights reserved.</p>
            <Link to="/terms" className="mt-2 md:mt-0 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200">
              Terms and Services
            </Link>
          </div>
        </div>
      </div>
    </footer >
  );
};

export default Footer;
