import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import LoginForm from '../components/LoginForm';
import { Badge, Card } from '../components/ui';

const proofPoints = [
  'Save course and lesson progress.',
  'Return to your dashboard from any device.',
  'Use one account for Google or password sign-in.',
];

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectPath = location.state?.from || '/dashboard';

  return (
    <main className="min-h-screen bg-surface-body text-text-primary selection:bg-accent selection:text-white">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <section className="flex flex-col px-6 py-8 sm:px-10 lg:px-16">
          <Link to="/" className="mb-12 inline-flex items-center gap-2 self-start text-sm font-semibold text-text-muted transition-colors hover:text-accent">
            <ArrowLeftIcon className="h-4 w-4" /> Back to home
          </Link>
          <div className="flex flex-1 items-center justify-center">
            <Card padding="lg" className="w-full max-w-xl">
              <LoginForm
                onSuccess={() => navigate(redirectPath, { replace: true })}
                onSwitchToRegister={() => navigate('/register')}
                isPage
              />
            </Card>
          </div>
        </section>

        <aside className="relative hidden overflow-hidden border-l border-line-soft bg-surface-soft p-12 lg:flex lg:flex-col lg:justify-center xl:p-20">
          <div className="absolute inset-0 grid-technical opacity-30" aria-hidden="true" />
          <div className="relative max-w-2xl">
            <Badge variant="accent" className="mb-6">Welcome back</Badge>
            <h1 className="text-5xl font-bold tracking-tight text-text-primary xl:text-7xl">
              Continue building your financial foundation.
            </h1>
            <p className="mt-6 text-lg leading-8 text-text-muted">
              Sign in to pick up modules where you left off and keep your learning path tidy.
            </p>
            <Card padding="lg" className="mt-10 bg-surface-raised/80 backdrop-blur">
              <ul className="space-y-4">
                {proofPoints.map((point) => (
                  <li key={point} className="flex items-start gap-3 text-sm leading-6 text-text-muted">
                    <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </aside>
      </div>
    </main>
  );
}
