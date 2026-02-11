import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [updatingRole, setUpdatingRole] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated, updateProfile } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/courses', label: 'Courses' },
    { path: '/classes', label: 'Classes' },
    { path: '/tools', label: 'Tools' },
    { path: '/contact', label: 'Contact' },
  ];
  const homePath = '/';

  const isActive = (path) => location.pathname === path;

  if (['/login', '/register'].includes(location.pathname)) {
    return null;
  }

  return (
    <nav className="sticky top-0 z-40 bg-white/80 dark:bg-black/80 border-b border-zinc-100 dark:border-zinc-900 backdrop-blur-md">
      <div className="container-custom">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link to={homePath} className="flex items-center gap-3 group">
            <img
              src="/logo.png"
              alt="Caplet"
              className="h-9 w-auto rounded-lg object-contain group-hover:scale-105 transition-transform"
            />
            <span className="text-xl font-extrabold tracking-tighter text-black dark:text-white uppercase">
              Caplet
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-10">
            {navItems.map((item) => {
              const isActiveLink = isActive(item.path);
              const linkClass = `text-[11px] font-bold uppercase tracking-[0.15em] transition-all relative py-1 ${isActiveLink
                ? 'text-brand'
                : 'text-zinc-500 hover:text-black dark:hover:text-white'
                }`;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={linkClass}
                >
                  {item.label}
                  {isActiveLink && (
                    <span className="absolute bottom-0 left-0 w-full h-[2px] bg-brand" />
                  )}
                </Link>
              );
            })}

            {/* Dark Mode Toggle & Auth Section */}
            <div className="flex items-center space-x-6 pl-6 border-l border-zinc-100 dark:border-zinc-800">
              <button
                onClick={toggleTheme}
                className="text-zinc-400 hover:text-black dark:hover:text-white transition-colors"
                aria-label="Toggle dark mode"
              >
                {isDark ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
              {isAuthenticated ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowUserMenu((prev) => !prev)}
                    className="flex items-center space-x-2 text-xs font-bold uppercase tracking-widest text-black dark:text-white hover:text-brand transition-colors"
                  >
                    <span>{user?.firstName}</span>
                    <svg
                      className={`w-4 h-4 transform transition-transform ${showUserMenu ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showUserMenu && (
                    <div className="absolute right-0 mt-4 w-60 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 shadow-2xl py-3 z-50">
                      <div className="px-5 py-3 border-b border-zinc-50 dark:border-zinc-800">
                        <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 mb-1">Authenticated</p>
                        <p className="text-sm font-bold text-black dark:text-white truncate">
                          {user?.firstName} {user?.lastName}
                        </p>
                        <p className="text-[10px] font-bold text-brand uppercase tracking-tighter">
                          {user?.role === 'admin' ? 'System Admin' : user?.role === 'instructor' ? 'Faculty' : 'Student'}
                        </p>
                      </div>
                      <Link
                        to="/settings"
                        onClick={() => setShowUserMenu(false)}
                        className="block w-full text-left px-5 py-3 text-xs font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-black dark:hover:text-white"
                      >
                        Profile Settings
                      </Link>
                      {user?.role !== 'admin' && (
                        <button
                          type="button"
                          disabled={updatingRole}
                          onClick={async () => {
                            try {
                              setUpdatingRole(true);
                              const nextRole = user?.role === 'instructor' ? 'student' : 'instructor';
                              await updateProfile({ role: nextRole });
                            } catch (e) {
                              console.error('Role update error:', e);
                            } finally {
                              setUpdatingRole(false);
                            }
                          }}
                          className="w-full text-left px-5 py-3 text-xs font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-black dark:hover:text-white disabled:opacity-50"
                        >
                          Switch Role
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setShowUserMenu(false);
                          logout();
                        }}
                        className="w-full text-left px-5 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900 border-t border-zinc-50 dark:border-zinc-800 transition-colors"
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => navigate('/login')}
                  className="px-5 py-2 bg-black dark:bg-white text-white dark:text-black text-[10px] font-bold uppercase tracking-widest hover:bg-brand dark:hover:bg-brand dark:hover:text-white transition-all hover-lift active:scale-95"
                >
                  Join / Sign In
                </button>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-black dark:text-white focus:outline-none"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden pb-6 reveal-up">
            <div className="space-y-1">
              {navItems.map((item) => {
                const isActiveLink = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`block px-4 py-3 text-xs font-bold uppercase tracking-widest border-l-2 ${isActiveLink
                      ? 'text-brand border-brand bg-zinc-50 dark:bg-zinc-900'
                      : 'text-zinc-500 border-transparent hover:text-black dark:hover:text-white'
                      }`}
                    onClick={() => setIsOpen(false)}
                  >
                    {item.label}
                  </Link>
                );
              })}
              {!isAuthenticated && (
                <div className="px-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 mt-2">
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      navigate('/login');
                    }}
                    className="w-full py-3 bg-black dark:bg-white text-white dark:text-black text-[10px] font-bold uppercase tracking-widest hover:bg-brand dark:hover:bg-brand dark:hover:text-white transition-all"
                  >
                    Join / Sign In
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

    </nav>
  );
};

export default Navbar;
