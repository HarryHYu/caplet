import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon, GlobeAltIcon, BriefcaseIcon, WalletIcon, BookOpenIcon } from '@heroicons/react/24/outline';
import courses from '../content/money/catalog.json';

const introductions = {
  'settling-in': { title: 'New to Australia', description: 'Get to know bank accounts, tax numbers and how to keep your money safe.', icon: GlobeAltIcon, label: 'A good place to begin' },
  'first-job': { title: 'Starting a job', description: 'Understand your payslip, the tax you pay and money saved for retirement.', icon: BriefcaseIcon, label: 'Work and pay' },
  'everyday-money': { title: 'Managing everyday money', description: 'Plan your spending and learn how to save for something you need.', icon: WalletIcon, label: 'Spending and saving' },
};
const descriptions = {
  'business-basics': 'How businesses earn money, find funding and make decisions.',
  borrowing: 'Understand loans, credit cards and where to get help with debt.',
  'investing-basics': 'Explore shares, funds and the risks of investing.',
  'money-and-the-economy': 'Learn why prices, interest rates and currencies change.',
  'quick-reads': 'Short introductions to GST, money rules and keeping records.',
};

export default function MoneyCourseExplorer() {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? courses : courses.filter((course) => introductions[course.course]);
  return <section id="learn" className="scroll-mt-24 py-9" aria-labelledby="money-lessons-title">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div><h2 id="money-lessons-title" className="font-display text-2xl font-extrabold tracking-tight text-text-primary">{showAll ? 'Explore all courses' : 'What would you like to learn?'}</h2><p className="mt-2 text-sm text-text-muted">Choose one. You do not need to know anything before you start.</p></div>
      <Link to="/money/learn" className="inline-flex min-h-11 items-center text-sm font-bold text-accent">Search lessons <ArrowRightIcon className="ml-2 h-4 w-4" aria-hidden="true" /></Link>
    </div>
    <div id="money-course-grid" className="grid gap-5 md:grid-cols-3">
      {visible.map((course) => {
        const intro = introductions[course.course];
        const Icon = intro?.icon || BookOpenIcon;
        return <Link key={course.course} to={`/money/learn?course=${course.course}`} className="group flex flex-col rounded-2xl border border-line-soft bg-surface-raised p-6 transition-colors hover:border-accent hover:bg-accent-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
          <div className="mb-6 flex items-center justify-between gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-accent-soft text-accent"><Icon className="h-6 w-6" aria-hidden="true" /></span><span className="text-xs text-text-dim">{course.lessons.length} {course.course === 'quick-reads' ? 'short reads' : 'lessons'}</span></div>
          <p className="text-xs font-semibold text-accent">{intro?.label || 'Explore further'}</p>
          <h3 className="mt-2 font-display text-xl font-bold leading-tight text-text-primary">{intro?.title || course.title}</h3>
          <p className="mb-6 mt-3 text-sm leading-7 text-text-muted">{intro?.description || descriptions[course.course]}</p>
          <span className="mt-auto flex items-center justify-between border-t border-line-soft pt-4 text-sm font-bold text-accent">View course <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></span>
        </Link>;
      })}
    </div>
    <div className="mt-6 text-center"><button type="button" aria-expanded={showAll} aria-controls="money-course-grid" onClick={() => setShowAll(!showAll)} className="min-h-11 rounded-xl border border-line-soft px-6 py-3 text-sm font-bold text-text-primary hover:bg-surface-soft">{showAll ? 'Show beginner courses' : 'See all 8 courses'}</button></div>
  </section>;
}
