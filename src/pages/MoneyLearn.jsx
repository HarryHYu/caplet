import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { moneyCourses, moneyLessons } from '../data/moneyLessons';
import MoneyReadingHelp from '../components/MoneyReadingHelp';

const markdownComponents = {
  h2: ({ children }) => <h2 id={children === 'Glossary' ? 'money-glossary' : undefined} tabIndex={children === 'Glossary' ? -1 : undefined} className="mb-4 mt-10 scroll-mt-24 font-display text-2xl font-extrabold tracking-tight text-text-primary">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-3 mt-6 font-display text-xl font-bold text-text-primary">{children}</h3>,
  p: ({ children }) => <p className="my-4 leading-8 text-text-muted">{children}</p>,
  ul: ({ children }) => <ul className="my-4 list-disc space-y-2 pl-6 text-text-muted">{children}</ul>,
  ol: ({ children }) => <ol className="my-4 list-decimal space-y-3 pl-6 text-text-muted">{children}</ol>,
  strong: ({ children }) => <strong className="font-bold text-text-primary">{children}</strong>,
  a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer" className="break-words font-semibold text-accent underline underline-offset-4">{children}</a>,
  hr: () => <hr className="my-8 border-line-soft" />,
};

function DraftNotice({ pendingChecks = 0 }) {
  return <aside className="my-6 rounded-2xl border border-line-soft bg-surface-soft p-5 text-sm leading-relaxed text-text-muted" aria-label="Draft status">
    <p className="font-bold text-text-primary">Draft learning material · awaiting review</p>
    <p className="mt-1">General education, not personal financial advice. Sources were accessed on 29 September 2026; rules can change.{pendingChecks > 0 ? ` This page has ${pendingChecks} factual ${pendingChecks === 1 ? 'check' : 'checks'} still to confirm, marked in the text.` : ''}</p>
  </aside>;
}

export default function MoneyLearn() {
  const [query, setQuery] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedCourse = searchParams.get('course');
  const category = moneyCourses.some((course) => course.course === requestedCourse) ? requestedCourse : 'all';
  const setCategory = (value) => setSearchParams(value === 'all' ? {} : { course: value });
  const courses = moneyCourses.filter((course) => category === 'all' || category === course.course).map((course) => ({
    ...course,
    lessons: course.lessons.filter((lesson) => `${lesson.title} ${course.title}`.toLowerCase().includes(query.trim().toLowerCase())),
  })).filter((course) => course.lessons.length);
  return <div className="minimal-page"><div className="container-custom">
    <Link to="/money" className="inline-flex min-h-11 items-center text-sm font-bold text-accent">← Money overview</Link>
    <header className="minimal-page-header mt-6"><span className="section-kicker">Money · Learn</span><h1 className="minimal-page-title">Learn about money.</h1><p className="minimal-page-description">Everyday Australian money, explained one idea at a time. Explore 28 lessons and 3 quick reads across eight topics.</p></header>
    <DraftNotice />
    <div className="mb-10 grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-bold text-text-primary">Search lessons<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try tax, saving or investing" className="mt-2 block min-h-12 w-full rounded-xl border border-line-soft bg-surface-raised px-4 text-text-primary" /></label>
      <label className="text-sm font-bold text-text-primary">Choose a topic<select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-2 block min-h-12 w-full rounded-xl border border-line-soft bg-surface-raised px-4 text-text-primary"><option value="all">All topics</option>{moneyCourses.map((course) => <option key={course.course} value={course.course}>{course.title}</option>)}</select></label>
    </div>
    <p role="status" className="mb-6 text-sm text-text-dim">{courses.reduce((sum, course) => sum + course.lessons.length, 0)} results</p>
    {courses.map((course) => <section key={course.course} className="mb-12" aria-labelledby={`course-${course.course}`}><h2 id={`course-${course.course}`} className="mb-5 font-display text-2xl font-extrabold text-text-primary">{course.title}</h2><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{course.lessons.map((lesson) => <Link key={lesson.slug} to={`/money/learn/${lesson.slug}`} className="group rounded-2xl border border-line-soft bg-surface-raised p-6 transition-colors hover:bg-accent-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"><p className="text-xs font-bold uppercase tracking-wider text-text-dim">{lesson.kind === 'article' ? 'Quick read' : `Module ${lesson.module}`} · {lesson.minutes} min</p><h3 className="mt-3 font-display text-xl font-bold text-text-primary">{lesson.title}</h3><p className="mt-5 text-sm font-bold text-accent">{lesson.kind === 'article' ? 'Read article' : 'Open lesson'} →</p>{lesson.pendingChecks > 0 && <p className="mt-3 text-xs text-text-dim">Includes checks awaiting confirmation</p>}</Link>)}</div></section>)}
    {!courses.length && <p className="rounded-2xl bg-surface-soft p-8 text-text-muted">No lessons match. Try a different search or choose all topics.</p>}
  </div></div>;
}

export function MoneyLesson() {
  const [largeText, setLargeText] = useState(false);
  const { slug } = useParams();
  const lesson = moneyLessons.find((item) => item.slug === slug);
  if (!lesson) return <div className="minimal-page"><div className="container-custom"><h1 className="minimal-page-title">Lesson not found</h1><Link to="/money/learn" className="btn-primary mt-6">Browse money lessons</Link></div></div>;
  const siblings = moneyCourses.find((course) => course.course === lesson.course).lessons;
  const index = siblings.findIndex((item) => item.slug === slug);
  const previous = siblings[index - 1];
  const next = siblings[index + 1];
  return <div className="minimal-page"><div className="container-custom">
    <Link to="/money/learn" className="inline-flex min-h-11 items-center text-sm font-bold text-accent">← All money lessons</Link>
    <div className="mx-auto mt-6 max-w-3xl">
      <header><span className="section-kicker">{lesson.courseTitle} · {lesson.kind === 'article' ? 'Quick read' : `Module ${lesson.module}`}</span><h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-text-primary md:text-5xl">{lesson.title}</h1><p className="mt-4 text-sm text-text-dim">{lesson.minutes} min · Draft</p></header>
      <DraftNotice pendingChecks={lesson.pendingChecks} />
      <div className="mb-5 flex flex-wrap gap-3" aria-label="Reading tools">
        <button type="button" aria-pressed={largeText} onClick={() => setLargeText(!largeText)} className="min-h-11 rounded-xl border border-line-soft px-4 text-sm font-bold text-text-primary">{largeText ? 'Standard text' : 'Larger text'}</button>
        <a href="#money-glossary" onClick={(event) => { event.preventDefault(); const glossary = document.getElementById('money-glossary'); glossary?.scrollIntoView({ block: 'start' }); glossary?.focus({ preventScroll: true }); }} className="inline-flex min-h-11 items-center rounded-xl border border-line-soft px-4 text-sm font-bold text-accent">Money words</a>
      </div>
      <MoneyReadingHelp />
      <article className={`mt-5 rounded-3xl bg-surface-raised p-6 md:p-10 ${largeText ? 'text-xl' : 'text-base'}`}>
        <ReactMarkdown components={markdownComponents}>{lesson.body}</ReactMarkdown>
        {lesson.answers && <details key={slug} className="my-8 rounded-2xl border border-line-soft bg-surface-soft p-5"><summary className="cursor-pointer font-bold text-accent">Show answers</summary><ReactMarkdown components={markdownComponents}>{lesson.answers}</ReactMarkdown></details>}
        {lesson.afterAnswers && <ReactMarkdown components={markdownComponents}>{lesson.afterAnswers}</ReactMarkdown>}
      </article>
      <nav aria-label="Lesson navigation" className="mt-8 grid gap-4 sm:grid-cols-2">{previous ? <Link to={`/money/learn/${previous.slug}`} className="rounded-2xl border border-line-soft p-5 text-sm font-bold text-accent">← Previous: {previous.title}</Link> : <span />}{next && <Link to={`/money/learn/${next.slug}`} className="rounded-2xl border border-line-soft p-5 text-sm font-bold text-accent">Next: {next.title} →</Link>}</nav>
    </div>
  </div></div>;
}
