import { Link } from 'react-router-dom';
import { ArrowRightIcon, BookOpenIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import MoneyCourseExplorer from '../components/MoneyCourseExplorer';
import MoneyReadingHelp from '../components/MoneyReadingHelp';

export default function MoneyOverview() {
  return (
    <div className="minimal-page">
      <div className="container-custom">
        <header className="relative overflow-hidden rounded-3xl border border-line-soft bg-accent-soft p-7 md:p-10">
          <div className="grid items-center gap-8 lg:grid-cols-[1.5fr_1fr]">
            <div>
              <span className="section-kicker">Money · Start here</span>
              <h1 className="mt-4 max-w-xl font-display text-4xl font-extrabold leading-tight tracking-tight text-text-primary md:text-5xl">Money in Australia,<br />made easier.</h1>
              <p className="mt-4 max-w-lg text-base leading-7 text-text-muted">New to Australia, or just new to managing money? Learn the basics in plain English, at your own pace.</p>
              <Link to="/money/learn/money-basics-in-australia" className="btn-primary mt-6 inline-flex w-fit">Start with the basics <ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></Link>
              <p className="mt-3 text-xs text-text-muted">No experience needed. Start with one lesson.</p>
            </div>
            <div className="rounded-2xl border border-line-soft bg-surface-raised p-6">
              <BookOpenIcon className="mb-4 h-7 w-7 text-accent" aria-hidden="true" />
              <h2 className="font-display text-lg font-bold text-text-primary">A little help at every step</h2>
              <ul className="mt-4 space-y-4 text-sm text-text-muted">
                {['Read a short explanation', 'See an everyday example', 'Try a few questions — no pressure'].map((text) => <li key={text} className="flex items-start gap-3"><CheckCircleIcon className="h-5 w-5 shrink-0 text-accent" aria-hidden="true" />{text}</li>)}
              </ul>
            </div>
          </div>
        </header>
        <MoneyReadingHelp />
        <MoneyCourseExplorer />
        <p className="mt-4 border-t border-line-soft pt-5 text-xs leading-6 text-text-dim">Draft learning material · awaiting review. General education only, not personal financial advice.</p>
      </div>
    </div>
  );
}
