import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BookOpenIcon,
  CheckBadgeIcon,
  ClipboardDocumentCheckIcon,
} from '@heroicons/react/24/outline';
import { useReveal } from '../lib/useReveal';
import Glyph from '../components/SubjectGlyph';
import CapletLoader from '../components/CapletLoader';
import { faculties } from '../data/hscSubjects';
import api from '../services/api';
import ResourceLibrary from './ResourceLibrary';

const LibrarySubject = () => {
  useReveal();
  const { subject: slug } = useParams();
  const [pack, setPack] = useState(null);
  const [loading, setLoading] = useState(slug !== 'economics');

  let match = null;
  for (const faculty of faculties) {
    const subject = faculty.subjects.find((item) => item.slug === slug);
    if (subject) match = { subject, faculty };
  }

  useEffect(() => {
    if (slug === 'economics') return;
    let cancelled = false;
    setLoading(true);
    Promise.resolve(api.getPublishedSubjectPacks?.(slug) || { subjectPacks: [] })
      .then((data) => { if (!cancelled) setPack(data?.subjectPacks?.[0] || null); })
      .catch(() => { if (!cancelled) setPack(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [slug]);

  if (!match) return <Navigate to="/library" replace />;
  if (slug === 'economics') return <ResourceLibrary />;
  if (loading) return <div className="min-h-screen bg-surface-body grid place-items-center"><CapletLoader message="Opening this subject…" /></div>;
  if (!pack) return <Navigate to="/library" replace />;

  const { subject, faculty } = match;
  const outcomes = Array.isArray(pack.outcomes) ? pack.outcomes : [];
  const year11 = outcomes.filter((outcome) => String(outcome.yearLevel || '').includes('11'));
  const year12 = outcomes.filter((outcome) => String(outcome.yearLevel || '').includes('12'));
  const groups = [
    { title: 'Year 11 foundations', outcomes: year11 },
    { title: 'Year 12 outcomes', outcomes: year12 },
  ].filter((group) => group.outcomes.length);
  if (!groups.length) groups.push({ title: 'Syllabus outcomes', outcomes });

  return (
    <div className="min-h-screen bg-surface-body pb-28 pt-24 selection:bg-accent selection:text-accent-contrast md:pt-28">
      <div className="container-custom">
        <Link to="/library" className="focus-ring reveal inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-bold text-text-muted hover:text-accent">
          <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" /> Back to Learn
        </Link>

        <header className="reveal mt-8 grid gap-8 rounded-3xl block-blue p-7 md:grid-cols-[1fr_auto] md:items-end md:p-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className={`grid h-16 w-16 shrink-0 place-items-center rounded-2xl ${faculty.block} ${faculty.text}`}>
              <Glyph className="h-8 w-8">{subject.glyph}</Glyph>
            </div>
            <div>
              <p className="section-kicker">{faculty.name} · Published curriculum pack</p>
              <h1 className="mt-2 font-display text-5xl font-extrabold tracking-tight text-text-primary md:text-7xl">{subject.name}.</h1>
              <p className="mt-4 max-w-2xl text-base font-medium leading-relaxed text-text-muted">{pack.description || `${pack.syllabusName} outcomes, diagnostic practice, and mastery evidence in one learning loop.`}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to={pack.studentLinks.diagnostic} className="btn-primary">Start diagnostic <ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></Link>
            <Link to={pack.studentLinks.mastery} className="btn-secondary">View mastery</Link>
          </div>
        </header>

        <section className="reveal mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl bg-surface-raised p-6"><CheckBadgeIcon className="h-7 w-7 text-accent" /><p className="mt-4 text-xs font-bold uppercase tracking-[0.12em] text-text-dim">Published syllabus</p><p className="mt-2 font-display text-xl font-extrabold">{pack.syllabusName || pack.title}</p></div>
          <div className="rounded-3xl bg-surface-raised p-6"><BookOpenIcon className="h-7 w-7 text-accent" /><p className="mt-4 text-xs font-bold uppercase tracking-[0.12em] text-text-dim">Mapped outcomes</p><p className="mt-2 font-display text-3xl font-extrabold">{outcomes.length}</p></div>
          <Link to={pack.studentLinks.practice} className="card-lift focus-ring group rounded-3xl block-green p-6"><ClipboardDocumentCheckIcon className="h-7 w-7 text-accent" /><p className="mt-4 text-xs font-bold uppercase tracking-[0.12em] text-text-dim">Daily practice</p><p className="mt-2 font-display text-xl font-extrabold">Get questions chosen from your evidence</p><span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-accent">Practise now <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span></Link>
        </section>

        <section className="reveal mt-14">
          <p className="section-kicker">What you will learn</p>
          <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight md:text-4xl">Syllabus outcomes</h2>
          <div className="mt-7 grid gap-6 lg:grid-cols-2">
            {groups.map((group) => (
              <div key={group.title} className="rounded-3xl bg-surface-raised p-6 md:p-8">
                <h3 className="font-display text-2xl font-extrabold">{group.title}</h3>
                <div className="mt-5 space-y-3">
                  {group.outcomes.map((outcome) => (
                    <div key={outcome.id} className="rounded-2xl bg-surface-soft p-4">
                      <p className="text-xs font-extrabold uppercase tracking-wide text-accent">{outcome.code}</p>
                      <p className="mt-1 text-sm font-bold leading-relaxed text-text-primary">{outcome.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default LibrarySubject;
