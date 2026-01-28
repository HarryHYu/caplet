import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [updatingRole, setUpdatingRole] = useState(false);
  const location = useLocation();
  const { user, logout, isAuthenticated, updateProfile } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/about', label: 'About' },
    { path: '/mission', label: 'Mission' },
    { path: '/courses', label: 'Courses' },
    { path: '/classes', label: 'Classes' },
    { path: '/tools', label: 'Tools' },
    { path: '/faq', label: 'FAQ' },
    { path: '/contact', label: 'Contact' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="container-custom">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <img src="/logo.png" alt="Caplet" className="h-8 w-auto" />
            <span className="text-xl font-bold text-gray-900 dark:text-white">Caplet</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => {
              const isActiveLink = isActive(item.path);
              const linkClass = `text-sm font-medium transition-colors duration-200 pb-1 ${
                isActiveLink
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 border-b-2 border-transparent'
              }`;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={linkClass}
                >
                  {item.label}
                </Link>
              );
            })}
            
            {/* Dark Mode Toggle & Auth Section */}
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Toggle dark mode"
              >
                {isDark ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
              {isAuthenticated ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowUserMenu((prev) => !prev)}
                    className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    <span>
                      Hello, {user?.firstName}
                      {user?.role === 'admin'
                        ? ' (admin)'
                        : user?.role === 'instructor'
                        ? ' (teacher)'
                        : ' (student)'}
                    </span>
                    <svg
                      className={`w-4 h-4 transform transition-transform ${
                        showUserMenu ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-2 z-50">
                      <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Signed in as
                        </p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {user?.firstName} {user?.lastName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Role:{' '}
                          {user?.role === 'admin'
                            ? 'Admin'
                            : user?.role === 'instructor'
                            ? 'Teacher'
                            : 'Student'}
                        </p>
                      </div>
                      {user?.role !== 'admin' && (
                        <button
                          type="button"
                          disabled={updatingRole}
                          onClick={async () => {
                            try {
                              setUpdatingRole(true);
                              const nextRole =
                                user?.role === 'instructor' ? 'student' : 'instructor';
                              await updateProfile({ role: nextRole });
                            } catch (e) {
                              console.error('Role update error:', e);
                            } finally {
                              setUpdatingRole(false);
                            }
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                        >
                          {user?.role === 'instructor'
                            ? 'Switch to student account'
                            : 'Switch to teacher account'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={logout}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 border-t border-gray-100 dark:border-gray-700"
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white focus:outline-none"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-200">
              {navItems.map((item) => {
                const isActiveLink = isActive(item.path);
                const linkClass = `block px-3 py-2 text-base font-medium rounded-md transition-colors duration-200 ${
                  isActiveLink
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : 'text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`;
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={linkClass}
                    onClick={() => setIsOpen(false)}
                  >
                    {item.label}
                  </Link>
                );
              })}
              
              {/* Mobile Dark Mode Toggle & Auth Section */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={toggleTheme}
                  className="w-full text-left px-3 py-2 text-base font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md flex items-center space-x-2"
                >
                  {isDark ? (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      <span>Light Mode</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                      </svg>
                      <span>Dark Mode</span>
                    </>
                  )}
                </button>
                {isAuthenticated ? (
                  <>
                    <div className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300">
                      Hello, {user?.firstName}{' '}
                      {user?.role === 'admin'
                        ? '(admin)'
                        : user?.role === 'instructor'
                        ? '(teacher)'
                        : '(student)'}
                    </div>
                    {user?.role !== 'admin' && (
                      <button
                        onClick={async () => {
                          try {
                            const nextRole =
                              user?.role === 'instructor' ? 'student' : 'instructor';
                            await updateProfile({ role: nextRole });
                          } catch (e) {
                            console.error('Role update error:', e);
                          }
                        }}
                        className="w-full text-left px-3 py-2 text-base font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md"
                      >
                        {user?.role === 'instructor'
                          ? 'Switch to student account'
                          : 'Switch to teacher account'}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        logout();
                        setIsOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-base font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setShowAuthModal(true);
                      setIsOpen(false);
                    }}
                    className="w-full px-3 py-2 bg-blue-600 text-white text-base font-medium rounded-md hover:bg-blue-700 dark:hover:bg-blue-500"
                  >
                    Sign In
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="relative">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute -top-4 -right-4 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            {authMode === 'login' ? (
              <LoginForm 
                onSuccess={() => setShowAuthModal(false)}
                onSwitchToRegister={() => setAuthMode('register')}
              />
            ) : (
              <RegisterForm 
                onSuccess={() => setShowAuthModal(false)}
                onSwitchToLogin={() => setAuthMode('login')}
              />
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
