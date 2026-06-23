import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Footer = () => {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const homePath = isAuthenticated ? '/dashboard' : '/';

  if (['/login', '/register'].includes(location.pathname)) {
    return null;
  }

  if (/\/courses\/[^/]+\/lessons\/[^/]+/.test(location.pathname)) {
    return null;
  }

  if (['/editor', '/metrics', '/survey-results'].includes(location.pathname)) {
    return null;
  }

  return (
    <footer className="bg-surface-body border-t border-line-soft">
      <div className="container-custom py-32">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-20">
          <div className="md:col-span-6">
            <Link to={homePath} className="flex items-center gap-2 mb-12 group">
              <img
                src="/logo.png"
                alt="Caplet Logo"
                className="w-10 h-10 object-contain transition-transform group-hover:scale-110 rounded-full overflow-hidden"
              />
              <span className="text-2xl font-serif italic font-bold tracking-tight text-text-primary">
                Caplet.
              </span>
            </Link>
            <p className="text-xl font-serif italic text-text-muted mb-12 max-w-sm leading-relaxed">
              A free platform for structured courses, tools, and collaborative workspaces.
            </p>
          </div>

          <div className="md:col-span-3">
            <h3 className="text-sm font-semibold text-accent mb-8">Learn</h3>
            <ul className="space-y-4">
              {[
                { label: 'Courses', path: '/courses' },
                { label: 'Classes', path: '/classes' },
                { label: 'Tools', path: '/tools' },
              ].map(link => (
                <li key={link.path}>
                  <Link to={link.path} className="text-sm text-text-muted hover:text-accent transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-3">
            <h3 className="text-sm font-semibold text-accent mb-8">Support</h3>
            <ul className="space-y-4">
              {[
                { label: 'Dashboard', path: '/dashboard' },
                { label: 'Contact', path: '/contact' },
                { label: 'Terms & privacy', path: '/terms' },
              ].map(link => (
                <li key={link.path}>
                  <Link to={link.path} className="text-sm text-text-muted hover:text-accent transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-24 pt-8 border-t border-line-soft flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-text-dim">
            © {new Date().getFullYear()} Caplet
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
