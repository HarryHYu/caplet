import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-white dark:bg-black border-t border-zinc-100 dark:border-zinc-900">
      <div className="container-custom py-20">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-16">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-4 mb-8 group">
              <div className="bg-white p-1.5 rounded-sm border border-zinc-100">
                <img src="/logo.png" alt="Caplet" className="h-8 w-8 object-contain" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-black dark:text-white uppercase tracking-tighter">
                  Caplet
                </p>
                <p className="text-[10px] uppercase font-bold tracking-[0.3em] text-brand">
                  Systemic Education
                </p>
              </div>
            </div>
            <p className="text-zinc-500 dark:text-zinc-400 mb-8 max-w-sm leading-relaxed font-medium">
              Professional financial education designed for the Australian context. Structured, data-driven, and built for institutional excellence.
            </p>
          </div>

          {/* Platform */}
          <div>
            <h3 className="text-[11px] font-bold text-black dark:text-white uppercase tracking-[0.2em] mb-8">Platform</h3>
            <ul className="space-y-4">
              <li>
                <Link to="/courses" className="text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-black dark:hover:text-white transition-colors">
                  Academy
                </Link>
              </li>
              <li>
                <Link to="/tools" className="text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-black dark:hover:text-white transition-colors">
                  Calculators
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-black dark:hover:text-white transition-colors">
                  Terminal
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-[11px] font-bold text-black dark:text-white uppercase tracking-[0.2em] mb-8">Resources</h3>
            <ul className="space-y-4">
              <li>
                <Link to="/contact" className="text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-black dark:hover:text-white transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-20 pt-10 border-t border-zinc-100 dark:border-zinc-900">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              © {new Date().getFullYear()} Caplet Education. All rights reserved.
            </p>
            <div className="flex items-center gap-10">
              <Link to="/terms" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-black dark:hover:text-white transition-colors">
                Terms
              </Link>
              <Link to="/terms" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-black dark:hover:text-white transition-colors">
                Privacy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
