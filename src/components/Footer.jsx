import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const links = [
  { label: 'Subjects', path: '/library' },
  { label: 'Courses', path: '/courses' },
  { label: 'Money', path: '/money' },
  { label: 'About', path: '/about' },
  { label: 'Trust center', path: '/trust' },
  { label: 'Contact', path: '/contact' },
];

export default function Footer() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  if (isAuthenticated || location.pathname !== '/') return null;

  return (
    <footer className="border-t border-line-soft bg-surface-body text-text-primary">
      <div className="container-custom py-10 md:py-12">
        <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <Link to="/" className="flex w-fit items-center gap-2.5" aria-label="Caplet home">
            <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-full border border-line-soft bg-surface-raised">
              <img src="/logo.png" alt="" className="h-full w-full object-cover" />
            </span>
            <span className="font-bricolage text-xl font-extrabold tracking-[-0.03em]">Caplet</span>
          </Link>

          <nav aria-label="Footer navigation">
            <ul className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-text-muted">
              {links.map((link) => (
                <li key={link.path}>
                  <Link to={link.path} className="transition-colors hover:text-accent">{link.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-line-soft pt-6 text-xs text-text-dim sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Caplet</p>
          <div className="flex gap-5">
            <Link to="/terms" className="hover:text-accent">Terms & privacy</Link>
            <span>Made in Australia</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
