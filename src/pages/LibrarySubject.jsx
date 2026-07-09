import { Link, Navigate, useParams } from 'react-router-dom';
import { useReveal } from '../lib/useReveal';
import Glyph from '../components/SubjectGlyph';
import { faculties } from '../data/hscSubjects';
import ResourceLibrary from './ResourceLibrary';

/**
 * A single subject's shelf, e.g. /library/economics. Generic — driven entirely
 * by the matching entry in data/hscSubjects, so unlocking another subject later
 * is just flipping `available: true` there, no new page needed.
 */

const shelfSections = [
  { title: 'Topic notes', body: 'Syllabus-mapped notes for every dot point, broken down topic by topic.' },
  { title: 'Worked examples', body: 'Model answers and step-by-step solutions for the questions that actually turn up in papers.' },
  { title: 'Practice questions', body: 'Exam-style questions with instant feedback, so you practise the way you are marked.' },
  { title: 'Past papers', body: 'Past HSC papers with marking guidelines, for when you are ready to test yourself properly.' },
];

const LibrarySubject = () => {
  useReveal();
  const { subject: slug } = useParams();

  let match = null;
  for (const faculty of faculties) {
    const subject = faculty.subjects.find((s) => s.slug === slug);
    if (subject) {
      match = { subject, faculty };
      break;
    }
  }

  if (!match || !match.subject.available) {
    return <Navigate to="/library" replace />;
  }

  const { subject, faculty } = match;

  if (subject.slug === 'economics') {
    return <ResourceLibrary />;
  }

  return (
    <div className="min-h-screen bg-surface-body py-32 selection:bg-accent selection:text-white">
      <div className="container-custom">

        <Link
          to="/library"
          className="reveal mb-10 inline-flex items-center gap-2 text-sm font-bold text-text-muted transition-colors hover:text-accent"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to library
        </Link>

        {/* Header */}
        <header className="reveal mb-20 flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
          <div className="flex items-start gap-5">
            <div className={`shrink-0 grid h-16 w-16 place-items-center rounded-2xl ${faculty.block} ${faculty.text}`}>
              <Glyph className="h-8 w-8" >{subject.glyph}</Glyph>
            </div>
            <div>
              <span className="font-hand text-accent text-xl mb-2 -rotate-2 inline-block">{faculty.name}</span>
              <h1 className="font-display font-extrabold tracking-tight text-6xl lg:text-7xl">{subject.name}.</h1>
              <p className="mt-4 max-w-xl text-lg leading-relaxed text-text-muted">
                This shelf is live — {subject.tag.toLowerCase()} content is being stocked here first. Check back as topic notes and revision material land.
              </p>
            </div>
          </div>
        </header>

        {/* What's landing on this shelf */}
        <div className="reveal-stagger grid grid-cols-1 gap-4 sm:grid-cols-2">
          {shelfSections.map((section) => (
            <div
              key={section.title}
              className="rounded-2xl border border-line-soft bg-surface-raised p-6 shadow-[0_20px_44px_-38px_rgba(20,20,18,0.45)]"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="font-display font-bold leading-tight tracking-tight text-text-primary">{section.title}</h3>
                <span className="shrink-0 rounded-full border border-line-soft bg-surface-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-text-dim">
                  Stocking
                </span>
              </div>
              <p className="text-sm leading-relaxed text-text-muted">{section.body}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default LibrarySubject;
