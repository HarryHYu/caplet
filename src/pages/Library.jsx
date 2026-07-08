import { useReveal } from '../lib/useReveal';
import Glyph from '../components/SubjectGlyph';
import { faculties, subjectCount } from '../data/hscSubjects';

/**
 * Resource Library — an HSC subject browser. Placeholder for now: the shelves
 * are laid out and each subject has its own hand-drawn glyph, but the per-subject
 * syllabus content is still being built, so every tile carries a "Soon" marker
 * instead of a link.
 */

const SubjectCard = ({ subject, block, text }) => (
  <div className="relative flex items-center gap-4 rounded-2xl border border-line-soft bg-surface-raised p-4 pr-5 shadow-[0_20px_44px_-38px_rgba(20,20,18,0.45)] transition-colors duration-200 hover:border-accent/40">
    {/* Subject glyph */}
    <div className={`shrink-0 grid h-12 w-12 place-items-center rounded-xl ${block} ${text}`}>
      <Glyph>{subject.glyph}</Glyph>
    </div>
    <div className="min-w-0 flex-1">
      <h3 className="font-display font-bold leading-tight tracking-tight text-text-primary">{subject.name}</h3>
      <p className="text-sm text-text-muted">{subject.tag}</p>
    </div>
    <span className="shrink-0 self-start rounded-full border border-line-soft bg-surface-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-text-dim">
      Soon
    </span>
  </div>
);

const Library = () => {
  useReveal();

  return (
    <div className="min-h-screen bg-surface-body py-32 selection:bg-accent selection:text-white">
      <div className="container-custom">

        {/* Header */}
        <header className="mb-20 reveal">
          <span className="font-hand text-accent text-xl mb-6 -rotate-2 inline-block">Every HSC subject, one shelf</span>
          <div className="flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="font-display font-extrabold tracking-tight text-6xl lg:text-8xl mb-8">
                Resource <br />library.
              </h1>
              <p className="max-w-xl text-xl leading-relaxed text-text-muted">
                A home for every HSC subject — syllabus-mapped lessons, worked examples and revision on one shelf. The catalogue is stocked; the lessons are landing subject by subject.
              </p>
            </div>

            {/* Catalogue index card — the library's own artefact, stands in for a stat tile */}
            <div className="hidden shrink-0 rotate-3 md:block">
              <div className="w-60 rounded-2xl border border-line-soft bg-surface-raised p-5 shadow-[0_28px_56px_-38px_rgba(20,20,18,0.5)]">
                <div className="mb-4 flex items-center justify-between">
                  <span className="font-hand text-lg -rotate-2 text-accent">catalogue</span>
                  <span className="rounded-md bg-accent-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">HSC</span>
                </div>
                <div className="font-display text-5xl font-extrabold tracking-tight text-text-primary">{subjectCount}</div>
                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-text-muted">subjects catalogued</p>
                <p className="mt-4 text-xs text-text-muted">Shelves filling up — new lessons land weekly.</p>
              </div>
            </div>
          </div>
        </header>

        {/* Faculties → subject shelves */}
        <div className="space-y-16">
          {faculties.map((faculty) => (
            <section key={faculty.name}>
              <div className="mb-6 flex items-center gap-4">
                <h2 className="font-display text-lg font-bold tracking-tight text-text-primary">{faculty.name}</h2>
                <span className={`${faculty.block} ${faculty.text} rounded-full px-3 py-1 text-xs font-bold`}>
                  {faculty.subjects.length}
                </span>
              </div>
              <div className="reveal-stagger grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {faculty.subjects.map((subject) => (
                  <SubjectCard key={subject.name} subject={subject} block={faculty.block} text={faculty.text} />
                ))}
              </div>
            </section>
          ))}
        </div>

      </div>
    </div>
  );
};

export default Library;
