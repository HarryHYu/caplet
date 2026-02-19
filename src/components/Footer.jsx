import { Link, useLocation } from 'react-router-dom';

const Footer = () => {
  const location = useLocation();

  if (['/login', '/register'].includes(location.pathname)) {
    return null;
  }

  return (
    <footer className="bg-surface-body border-t border-line-soft">
      <div className="container-custom py-32">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-20">
          {/* Brand Signature */}
          <div className="md:col-span-6">
            <Link to="/" className="flex items-center gap-4 mb-12 group">
              <div className="w-10 h-10 bg-text-primary flex items-center justify-center p-2 transition-transform duration-500 group-hover:rotate-90">
                <div className="w-full h-full bg-accent" />
              </div>
              <span className="text-3xl font-black tracking-ultra text-text-primary uppercase font-serif italic">
                Caplet.
              </span>
            </Link>
            <p className="text-xl font-serif italic text-text-muted mb-12 max-w-sm leading-relaxed">
              Professional financial education designed for the Australian context. Structured learning, built for school integration.
            </p>
            <div className="flex gap-4">
              {['Compliance', 'Literacy', 'Application'].map(tag => (
                <span key={tag} className="text-[9px] font-bold uppercase tracking-[0.3em] px-3 py-1 bg-surface-soft text-text-dim border border-line-soft">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Navigation Columns */}
          <div className="md:col-span-2">
            <h3 className="text-[10px] font-bold text-accent uppercase tracking-[0.4em] mb-10">Academy</h3>
            <ul className="space-y-6">
              {[
                { label: 'Curriculum', path: '/courses' },
                { label: 'Academy', path: '/classes' },
                { label: 'Instruments', path: '/tools' }
              ].map(link => (
                <li key={link.label}>
                  <Link to={link.path} className="text-[11px] font-bold uppercase tracking-widest text-text-muted hover:text-accent transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-2">
            <h3 className="text-[10px] font-bold text-accent uppercase tracking-[0.4em] mb-10">Resources</h3>
            <ul className="space-y-6">
              {[
                { label: 'Terminal', path: '/dashboard' },
                { label: 'Support', path: '/contact' },
                { label: 'Security', path: '#' }
              ].map(link => (
                <li key={link.label}>
                  <Link to={link.path} className="text-[11px] font-bold uppercase tracking-widest text-text-muted hover:text-accent transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-2 border-l border-line-soft pl-12 hidden lg:block">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-dim mb-4">Current Status</div>
            <div className="flex items-center gap-2 mb-8">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-text-primary uppercase tracking-widest">Network Active</span>
            </div>
            <div className="text-[9px] text-text-dim leading-relaxed font-medium uppercase tracking-widest">
              Deployment v4.2.0<br />
              Cluster: AU-SYD-1
            </div>
          </div>
        </div>

        <div className="mt-32 pt-12 border-t border-line-soft flex flex-col md:flex-row justify-between items-center gap-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-text-dim">
            © {new Date().getFullYear()} Caplet Education. Precision in Finance.
          </p>
          <div className="flex items-center gap-12 text-[10px] font-bold uppercase tracking-widest text-text-dim">
            <Link to="#" className="hover:text-accent transition-colors">Privacy Protocol</Link>
            <Link to="#" className="hover:text-accent transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};


export default Footer;
