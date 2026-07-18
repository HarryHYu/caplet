import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const columns = [
  {
    heading: 'Learn',
    links: [
      { label: 'Learning paths', path: '/courses' },
      { label: 'Classes', path: '/classes' },
      { label: 'Learn', path: '/library' },
    ],
  },
  {
    heading: 'Financial tools',
    links: [
      { label: 'Income tax', path: '/fintools/tax-calculator' },
      { label: 'Budget planner', path: '/fintools/budget-planner' },
      { label: 'Compound interest', path: '/fintools/compound-interest' },
      { label: 'Mortgage', path: '/fintools/mortgage' },
      { label: 'All tools', path: '/fintools' },
    ],
  },
  {
    heading: 'Study',
    links: [
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Personal study plan', path: '/study-plan' },
      { label: 'Revision queue', path: '/revision' },
      { label: 'Essay memoriser', path: '/essays' },
      { label: 'Education tools', path: '/edutools' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'Home', path: '/' },
      { label: 'Contact', path: '/contact' },
      { label: 'Trust center', path: '/trust' },
      { label: 'Terms & privacy', path: '/terms' },
    ],
  },
];

const socials = [
  {
    label: 'X',
    href: 'https://x.com',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    label: 'GitHub',
    href: 'https://github.com',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.34-5.47-5.96 0-1.32.47-2.39 1.24-3.23-.13-.3-.54-1.53.11-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.01 0c2.29-1.55 3.3-1.23 3.3-1.23.65 1.65.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.23 0 4.63-2.8 5.65-5.48 5.95.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12.01 12.01 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z" />
      </svg>
    ),
  },
  {
    label: 'Email',
    href: 'mailto:hello@caplet.app',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
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

  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <footer className="bg-[var(--footer-bg)] text-[var(--footer-text)]">
      {/* ── CTA band ── */}
      <div className="border-b border-[var(--footer-line)]">
        <div className="container-custom py-14 md:py-16 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div>
            <p className="font-hand text-2xl text-[var(--footer-accent)] -rotate-2 mb-2">ready when you are</p>
            <h2 className="font-display font-extrabold text-3xl md:text-4xl tracking-[-0.02em] leading-[1.05]">
              Start learning today — it&rsquo;s free.
            </h2>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold text-sm bg-[var(--footer-accent)] text-[var(--footer-bg)] hover:-translate-y-0.5 transition-transform"
            >
              Get started
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 7l5 5-5 5M6 12h12" />
              </svg>
            </Link>
            <Link
              to="/courses"
              className="inline-flex items-center rounded-xl px-5 py-3 font-semibold text-sm border border-[var(--footer-line)] text-[var(--footer-text)] hover:border-[var(--footer-accent)] hover:text-[var(--footer-accent)] transition-colors"
            >
              Browse courses
            </Link>
          </div>
        </div>
      </div>

      {/* ── Main columns ── */}
      <div className="container-custom py-16 md:py-20">
        <div className="grid grid-cols-2 lg:grid-cols-12 gap-x-8 gap-y-12">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-4">
            <Link to={homePath} className="flex items-center gap-2 group w-fit">
              <img
                src="/logo.png"
                alt="Caplet logo"
                className="w-9 h-9 object-contain rounded-full overflow-hidden transition-transform group-hover:scale-110"
              />
              <span className="text-2xl font-bricolage font-extrabold tracking-[-0.02em]">Caplet.</span>
            </Link>
            <p className="font-hand text-xl text-[var(--footer-accent)] mt-5 -rotate-2">learn anything, for free</p>
            <p className="text-sm text-[var(--footer-muted)] mt-3 max-w-xs leading-relaxed">
              A free, open platform for interactive courses, financial &amp; study tools, and classrooms —
              built for Australian students and lifelong learners.
            </p>

            {/* Socials */}
            <div className="flex items-center gap-2.5 mt-6">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="w-9 h-9 rounded-full border border-[var(--footer-line)] flex items-center justify-center text-[var(--footer-muted)] hover:text-[var(--footer-text)] hover:border-[var(--footer-accent)] hover:-translate-y-0.5 transition-all"
                >
                  {s.icon}
                </a>
              ))}
            </div>

            {/* Small trust row */}
            <div className="flex flex-wrap gap-2 mt-6">
              {['100% free', 'No ads', 'Open-source'].map((tag) => (
                <span
                  key={tag}
                  className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-[var(--footer-raised)] text-[var(--footer-muted)] border border-[var(--footer-line)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.heading} className="col-span-1 lg:col-span-2">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--footer-dim)] mb-5">
                {col.heading}
              </h3>
              <ul className="space-y-3.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.path}
                      className="text-sm text-[var(--footer-muted)] hover:text-[var(--footer-accent)] transition-colors inline-flex items-center gap-2 group"
                    >
                      <span className="w-3.5 h-px bg-[var(--footer-dim)] group-hover:w-5 group-hover:bg-[var(--footer-accent)] transition-all" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="border-t border-[var(--footer-line)]">
        <div className="container-custom py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] font-mono uppercase tracking-widest text-[var(--footer-dim)]">
            <span>© {new Date().getFullYear()} Caplet</span>
            <span aria-hidden className="text-[var(--footer-line)]">/</span>
            <span>Free &amp; open-source</span>
            <span aria-hidden className="text-[var(--footer-line)]">/</span>
            <span>Made in Australia</span>
          </div>
          <div className="flex items-center gap-5">
            <Link to="/trust" className="text-xs font-medium text-[var(--footer-muted)] hover:text-[var(--footer-accent)] transition-colors">
              Trust center
            </Link>
            <Link to="/terms" className="text-xs font-medium text-[var(--footer-muted)] hover:text-[var(--footer-accent)] transition-colors">
              Terms
            </Link>
            <Link to="/contact" className="text-xs font-medium text-[var(--footer-muted)] hover:text-[var(--footer-accent)] transition-colors">
              Contact
            </Link>
            <button
              type="button"
              onClick={scrollTop}
              className="text-xs font-medium text-[var(--footer-muted)] hover:text-[var(--footer-accent)] transition-colors inline-flex items-center gap-1.5"
            >
              Back to top
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
