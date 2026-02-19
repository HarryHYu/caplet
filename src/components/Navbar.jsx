import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const location = useLocation();
  const { user, logout, isAuthenticated } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const allNavItems = [
    { path: '/', label: 'Index', publicOnly: true },
    { path: '/dashboard', label: 'Terminal', privateOnly: true },
    { path: '/courses', label: 'Curriculum' },
    { path: '/classes', label: 'Academy' },
    { path: '/tools', label: 'Instruments' },
    { path: '/contact', label: 'Contact' },
  ];

  const navItems = allNavItems.filter(item => {
    if (isAuthenticated) {
      return !item.publicOnly;
    } else {
      return !item.privateOnly;
    }
  });

  const homePath = isAuthenticated ? '/dashboard' : '/';
  const isActive = (path) => location.pathname === path;

  if (['/login', '/register'].includes(location.pathname)) {
    return null;
  }

  return (
    <nav className="sticky top-0 z-50 bg-surface-body/90 backdrop-blur-xl border-b border-line-soft">
      <div className="container-custom">
        <div className="flex justify-between items-center h-24">
          {/* Logo */}
          <Link to={homePath} className="flex items-center gap-3 group">
            <img
              src="/logo.png"
              alt="Caplet Logo"
              className="w-8 h-8 object-contain transition-transform duration-500 group-hover:scale-110"
            />
            <span className="text-2xl font-black tracking-ultra text-text-primary uppercase font-serif italic">
              Caplet.
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-12">
            <div className="flex items-center gap-10">
              {navItems.map((item) => {
                const isActiveLink = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`text-[10px] font-bold uppercase tracking-[0.3em] transition-all relative py-2 ${isActiveLink
                      ? 'text-accent'
                      : 'text-text-dim hover:text-text-primary'
                      }`}
                  >
                    {item.label}
                    {isActiveLink && (
                      <span className="absolute -bottom-1 left-0 w-4 h-px bg-accent" />
                    )}
                  </Link>
                );
              })}
            </div>

            <div className="h-8 w-px bg-line-soft mx-4" />

            <div className="flex items-center gap-8">
              <button
                onClick={toggleTheme}
                className="text-text-dim hover:text-accent transition-colors duration-500"
                aria-label="Toggle dark mode"
              >
                {isDark ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                )}
              </button>

              {isAuthenticated ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-text-primary group"
                  >
                    <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                    {user?.firstName}
                  </button>
                  {showUserMenu && (
                    <div className="absolute right-0 mt-6 w-56 bg-surface-raised border border-line-soft shadow-2xl p-2 z-50 reveal-text">
                      <div className="px-5 py-4 border-b border-line-soft mb-2">
                        <p className="text-[9px] uppercase tracking-widest text-text-dim mb-1">Authenticated</p>
                        <p className="text-sm font-bold truncate">{user?.firstName} {user?.lastName}</p>
                      </div>
                      <Link to="/settings" onClick={() => setShowUserMenu(false)} className="block px-5 py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-surface-soft hover:text-accent transition-colors">Settings</Link>
                      <button onClick={logout} className="w-full text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-red-500 hover:bg-surface-soft transition-colors">Terminate Session</button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to="/login"
                  className="px-8 py-3 bg-text-primary text-surface-body text-[10px] font-bold uppercase tracking-widest hover:bg-accent transition-all duration-500"
                >
                  Join Academy
                </Link>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button key="mobile-toggle" onClick={() => setIsOpen(!isOpen)} className="text-text-primary">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-8 border-t border-line-soft reveal-text">
            <div className="flex flex-col gap-6">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className="text-xs font-bold uppercase tracking-[0.2em]"
                >
                  {item.label}
                </Link>
              ))}
              {!isAuthenticated && (
                <Link to="/login" onClick={() => setIsOpen(false)} className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Join Academy</Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
