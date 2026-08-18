import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const hiddenPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/play'];

const linkClass = 'focus-ring press inline-flex min-h-9 items-center rounded-lg px-2.5 text-xs font-bold tracking-[0.02em] text-text-muted transition-colors hover:bg-surface-soft hover:text-text-primary';

/**
 * Visitor-facing tablet navigation. This is intentionally separate from the
 * signed-in dashboard chrome: visitors get clear product entry points and
 * auth actions, without the Study/Money workspace switch.
 */
export default function TabletPublicNavbar() {
    const location = useLocation();
    const { isAuthenticated } = useAuth();

    if (isAuthenticated || hiddenPaths.includes(location.pathname)) return null;
    if (location.pathname.startsWith('/guardian-consent/') || location.pathname.startsWith('/live/host')) return null;

    return (
        <header
            data-testid="tablet-public-navbar"
            className="fixed inset-x-0 top-0 z-50 hidden bg-surface-body text-text-primary shadow-pop md:block lg:hidden"
        >
            <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-2 px-4 md:px-6">
                <Link to="/" className="focus-ring group flex shrink-0 items-center gap-2 rounded-lg" aria-label="Caplet home">
                    <span className="grid h-7 w-7 place-items-center overflow-hidden rounded-full bg-surface-soft ring-1 ring-line-soft transition-transform duration-300 group-hover:scale-105">
                        <img src="/logo.png" alt="Caplet logo" className="h-full w-full scale-105 rounded-full object-cover" />
                    </span>
                    <span className="font-display text-lg font-extrabold tracking-[-0.02em] text-text-primary">Caplet</span>
                </Link>

                <nav aria-label="Public navigation" className="ml-auto flex items-center gap-1">
                    <Link to="/library" className={linkClass}>Resource library</Link>
                    <Link to="/courses" className={linkClass}>Courses</Link>
                    <Link to="/assessments" className={linkClass}>Assessment dates</Link>
                    <Link to="/money" className={linkClass}>Financial tools</Link>
                    <Link to="/about" className={linkClass}>Team</Link>
                </nav>

                <div className="flex shrink-0 items-center gap-2">
                    <Link to="/login" className={linkClass}>Sign in</Link>
                    <Link
                        to="/register"
                        className="focus-ring press inline-flex min-h-9 items-center justify-center rounded-lg bg-accent px-3 text-xs font-bold tracking-[0.02em] text-accent-contrast transition-colors hover:bg-accent-strong"
                    >
                        Get started
                    </Link>
                </div>
            </div>
        </header>
    );
}
