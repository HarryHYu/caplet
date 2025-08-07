import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="container-custom py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <img src="/logo.png" alt="Caplet" className="h-8 w-auto" />
              <span className="text-xl font-bold text-gray-900">Caplet</span>
            </div>
            <p className="text-gray-600 mb-4 max-w-md">
              Empowering Australians with free, accessible financial education to bridge the financial literacy gap.
            </p>
            <p className="text-sm text-gray-500">
              © 2024 Caplet. All rights reserved.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/about" className="text-sm text-gray-600 hover:text-blue-600 transition-colors duration-200">
                  About
                </Link>
              </li>
              <li>
                <Link to="/mission" className="text-sm text-gray-600 hover:text-blue-600 transition-colors duration-200">
                  Mission
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-sm text-gray-600 hover:text-blue-600 transition-colors duration-200">
                  FAQ
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-sm text-gray-600 hover:text-blue-600 transition-colors duration-200">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Resources</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/references" className="text-sm text-gray-600 hover:text-blue-600 transition-colors duration-200">
                  References
                </Link>
              </li>
              <li>
                <a 
                  href="https://capletedu.org" 
                  className="text-sm text-gray-600 hover:text-blue-600 transition-colors duration-200"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  capletedu.org
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
