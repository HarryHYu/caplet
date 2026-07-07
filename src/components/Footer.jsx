import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const columns = [
  {
    heading: 'Learn',
    links: [
      { label: 'Courses', path: '/courses' },
      { label: 'Classes', path: '/classes' },
      { label: 'Tools', path: '/tools' },
      { label: 'Essay memoriser', path: '/essays' },
    ],
  },
  {
    heading: 'Support',
    links: [
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Contact', path: '/contact' },
      { label: 'Terms and privacy', path: '/terms' },
    ],
  },
  {
    heading: 'Contact',
    links: [
      { label: 'Twitter', path: '#' },
      { label: 'GitHub', path: '#' },
      { label: 'Email', path: '#' },
    ],
  },
];

const Footer = () => {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const homePath = isAuthenticated ? '/dashboard' : '/';

  // The full information footer belongs to the visitor-facing homepage only.
  // Once signed in (or anywhere other than the landing page), hide it.
  if (isAuthenticated || location.pathname !== '/') return null;
  if (['/login', '/register', '/play'].includes(location.pathname)) return null;
  if (/\/courses\/[^/]+\/lessons\/[^/]+/.test(location.pathname)) return null;
  if (['/editor', '/metrics', '/survey-results'].includes(location.pathname)) return null;
  if (location.pathname.startsWith('/live/host')) return null;

  return (
    <footer className="bg-surface-soft text-text-primary">
      <div className="container-custom py-20 md:py-28">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="col-span-1">
            <Link to={homePath} className="flex items-center gap-2 group">
              <img
                src="/logo.png"
                alt="Caplet logo"
                className="w-9 h-9 object-contain rounded-full overflow-hidden transition-transform group-hover:scale-110"
              />
              <span className="text-2xl font-bricolage font-extrabold tracking-[-0.02em] text-text-primary">Caplet.</span>
            </Link>
            <p className="font-hand text-xl text-accent mt-5 -rotate-2">learn anything, for free</p>
            <p className="text-sm text-text-muted mt-3 max-w-xs leading-relaxed">
              A free, open platform for building interactive courses, financial tools, and classrooms.
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.heading} className="col-span-1">
              <h3 className="font-display font-bold text-base mb-6 text-text-primary">{col.heading}</h3>
              <ul className="space-y-3.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link to={link.path} className="text-sm text-text-muted hover:text-accent transition-colors inline-flex items-center gap-2 group">
                      <span className="w-3.5 h-px bg-text-dim group-hover:w-5 group-hover:bg-accent transition-all" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-20 pt-8 border-t border-line-soft flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="text-xs font-mono text-text-dim uppercase tracking-widest">© {new Date().getFullYear()} Caplet</p>
          <p className="text-xs font-mono text-text-dim">Free and open-source.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
