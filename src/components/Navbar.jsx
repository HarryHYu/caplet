import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { user, logout, isAuthenticated } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const allNavItems = [
    { path: '/', label: 'Home', publicOnly: true },
    { path: '/dashboard', label: 'My Dashboard', privateOnly: true },
    { path: '/courses', label: 'Curriculum' },
    { path: '/classes', label: 'Academy' },
    { path: '/tools', label: 'Instruments' },
  ];

  const navItems = allNavItems.filter(item => {
    if (isAuthenticated) return !item.publicOnly;
    return !item.privateOnly;
  });

  const homePath = isAuthenticated ? '/dashboard' : '/';
  const isActive = (path) => location.pathname === path;

  // Hide navbar on specific focus routes
  const hidePaths = [
    '/login', 
    '/register'
  ];
  
  const isHidden = hidePaths.includes(location.pathname) || 
                   location.pathname.includes('/courses/') || 
                   location.pathname.includes('/lessons/');

  if (isHidden) {
    return null;
  }

  // Determine colors based on scroll and theme
  // We use dark mode variables generally, but the prompt says:
  // "Warm Australian Everyday" aesthetic. The hero is now light and warm.
  const isHome = location.pathname === '/';
  const applyGlass = scrolled || !isHome;
  
  const navClasses = applyGlass 
    ? "bg-white/80 dark:bg-black/60 backdrop-blur-md border border-black/10 dark:border-white/10 text-caplet-ink dark:text-white shadow-xl translate-y-2"
    : "bg-transparent border border-transparent text-caplet-ink translate-y-4";

  return (
    <div className="fixed top-0 inset-x-0 z-50 flex flex-col items-center pointer-events-none">


      {/* Floating Island Navbar */}
      <nav className={`pointer-events-auto mt-4 mx-4 sm:mx-6 md:mx-auto max-w-5xl w-[calc(100%-2rem)] md:w-full rounded-[2rem] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${navClasses}`}>
        <div className="px-6 py-4 flex items-center justify-between">
          
          {/* Logo */}
          <Link to={homePath} className="flex items-center gap-2 group relative z-10">
            <img 
              src="/logo.png" 
              alt="Caplet Logo" 
              className="w-10 h-10 object-contain transition-transform group-hover:scale-110 rounded-full overflow-hidden"
            />
            <span className="text-2xl font-serif italic font-bold tracking-tight">Caplet.</span>
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`text-sm font-display font-medium tracking-tight transition-colors hover:opacity-100 ${
                  isActive(item.path) ? 'opacity-100' : 'opacity-70'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 relative z-10">
            <button
              onClick={toggleTheme}
              className="p-2 opacity-70 hover:opacity-100 transition-opacity"
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
                  className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest bg-caplet-sky text-white px-4 py-2 rounded-full hover:bg-blue-700 transition-colors"
                >
                  {user?.firstName || 'User'}
                </button>
                {showUserMenu && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-surface-raised border border-line-soft rounded-2xl shadow-xl overflow-hidden py-2">
                    <Link to="/settings" onClick={() => setShowUserMenu(false)} className="block px-4 py-2 text-sm text-caplet-ocean dark:text-white hover:bg-caplet-parchment dark:hover:bg-zinc-800">Settings</Link>
                    <button onClick={logout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">Sign Out</button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="hidden md:inline-flex items-center justify-center bg-caplet-sky hover:bg-blue-700 text-white font-display font-semibold text-sm px-6 py-2.5 rounded-full transition-transform hover:-translate-y-0.5 active:translate-y-0 shadow-md"
              >
                Get Started Free
              </Link>
            )}

            {/* Mobile Toggle */}
            <button className="md:hidden p-2 opacity-70 hover:opacity-100" onClick={() => setIsOpen(!isOpen)}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isOpen && (
          <div className="md:hidden border-t border-black/5 dark:border-white/10 p-6 flex flex-col gap-4">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className="text-lg font-display font-medium"
              >
                {item.label}
              </Link>
            ))}
            {!isAuthenticated && (
              <Link
                to="/login"
                onClick={() => setIsOpen(false)}
                className="inline-flex items-center justify-center bg-caplet-sky text-white font-display font-semibold px-6 py-3 rounded-xl mt-4 text-center"
              >
                Get Started Free
              </Link>
            )}
          </div>
        )}
      </nav>
    </div>
  );
};

export default Navbar;
