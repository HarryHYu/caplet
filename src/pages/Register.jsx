import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import RegisterForm from '../components/RegisterForm';
import { Badge, Card } from '../components/ui';

const benefits = [
  'Free access to the course library.',
  'Progress tracking across modules and lessons.',
  'A calmer way to learn money basics before decisions feel urgent.',
];

export default function Register() {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-surface-body text-text-primary selection:bg-accent selection:text-white">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <section className="flex flex-col px-6 py-8 sm:px-10 lg:px-16">
          <Link to="/" className="mb-12 inline-flex items-center gap-2 self-start text-sm font-semibold text-text-muted transition-colors hover:text-accent">
            <ArrowLeftIcon className="h-4 w-4" /> Back to home
          </Link>
          <div className="flex flex-1 items-center justify-center">
            <Card padding="lg" className="w-full max-w-xl">
              <RegisterForm
                onSuccess={() => navigate('/dashboard', { replace: true })}
                onSwitchToLogin={() => navigate('/login')}
                isPage
              />
            </Card>
          </div>
        </section>

        <aside className="relative hidden overflow-hidden border-l border-line-soft bg-surface-soft p-12 lg:flex lg:flex-col lg:justify-center xl:p-20">
          <div className="absolute inset-0 grid-technical opacity-30" aria-hidden="true" />
          <div className="relative max-w-2xl">
            <Badge variant="accent" className="mb-6">Start learning</Badge>
            <h1 className="text-5xl font-bold tracking-tight text-text-primary xl:text-7xl">
              Create a Caplet account and keep momentum.
            </h1>
            <p className="mt-6 text-lg leading-8 text-text-muted">
              Join with Google or email, then move through public courses with saved progress and clearer next steps.
            </p>
            <Card padding="lg" className="mt-10 bg-surface-raised/80 backdrop-blur">
              <ul className="space-y-4">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3 text-sm leading-6 text-text-muted">
                    <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                    <span>{benefit}</span>
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
