import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useReveal } from '../lib/useReveal';
import { useMySubjects } from '../lib/useMySubjects';
import Glyph from '../components/SubjectGlyph';
import { faculties, subjectCount } from '../data/hscSubjects';

/**
 * Resource Library — an HSC subject browser. Mostly a placeholder for now: the
 * shelves are laid out and each subject has its own hand-drawn glyph, but the
 * per-subject syllabus content is still being built, so most tiles carry a
 * "Soon" marker instead of a link. Subjects with `available: true` (see
 * data/hscSubjects) link through to their shelf at /library/:slug.
 */

const SubjectCard = ({ subject, block, text }) => {
  const iconFrame = (
    <div className={`shrink-0 grid h-12 w-12 place-items-center rounded-xl ${block} ${text}`}>
      <Glyph>{subject.glyph}</Glyph>
    </div>
  );
  const label = (
    <div className="min-w-0 flex-1">
      <h3 className="font-display font-bold leading-tight tracking-tight text-text-primary">{subject.name}</h3>
      <p className="text-sm text-text-muted">{subject.tag}</p>
    </div>
  );

  if (subject.available) {
    return (
      <Link
        to={`/library/${subject.slug}`}
        className="relative flex items-center gap-4 rounded-2xl border border-line-soft bg-surface-raised p-4 pr-5 shadow-[0_20px_44px_-38px_rgba(20,20,18,0.45)] transition-colors duration-200 hover:border-accent/40"
      >
        {iconFrame}
        {label}
        <span className={`shrink-0 self-start rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${block} ${text}`}>
          Open
        </span>
      </Link>
    );
  }

  return (
    <div className="relative flex items-center gap-4 rounded-2xl border border-line-soft bg-surface-raised p-4 pr-5 shadow-[0_20px_44px_-38px_rgba(20,20,18,0.45)] transition-colors duration-200 hover:border-accent/40">
      {iconFrame}
      {label}
      <span className="shrink-0 self-start rounded-full border border-line-soft bg-surface-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-text-dim">
        Soon
      </span>
    </div>
  );
};

const SubjectChip = ({ subject, faculty, picked, onToggle }) => (
  <button
    type="button"
    onClick={() => onToggle(subject.name)}
    aria-pressed={picked}
    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-bold transition-colors ${
      picked
        ? `border-transparent ${faculty.block} ${faculty.text}`
        : 'border-line-soft bg-surface-raised text-text-muted hover:text-text-primary'
    }`}
  >
    <Glyph className="h-4 w-4">{subject.glyph}</Glyph>
    {subject.name}
  </button>
);

const Library = () => {
  useReveal();
  const { mySubjects, toggleSubject } = useMySubjects();
  const [filterActive, setFilterActive] = useState(() => mySubjects.length > 0);
  const [pickerOpen, setPickerOpen] = useState(false);

  const visibleFaculties = useMemo(() => {
    if (!filterActive) return faculties;
    return faculties
      .map((faculty) => ({ ...faculty, subjects: faculty.subjects.filter((s) => mySubjects.includes(s.name)) }))
      .filter((faculty) => faculty.subjects.length > 0);
  }, [filterActive, mySubjects]);

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

        {/* Filter bar */}
        <div className="reveal mb-10 flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-full border border-line-soft bg-surface-raised p-1">
            <button
              type="button"
              onClick={() => setFilterActive(false)}
              className={`rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${!filterActive ? 'bg-accent text-white' : 'text-text-muted hover:text-text-primary'}`}
            >
              All subjects
            </button>
            <button
              type="button"
              onClick={() => setFilterActive(true)}
              className={`rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${filterActive ? 'bg-accent text-white' : 'text-text-muted hover:text-text-primary'}`}
            >
              My subjects{mySubjects.length > 0 ? ` (${mySubjects.length})` : ''}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setPickerOpen((v) => !v)}
            className="rounded-full border border-line-soft bg-surface-raised px-4 py-1.5 text-sm font-bold text-text-muted transition-colors hover:text-accent"
          >
            {pickerOpen ? 'Done choosing' : 'Choose your subjects'}
          </button>
        </div>

        {/* Subject picker */}
        {pickerOpen && (
          <div className="reveal mb-16 rounded-2xl border border-line-soft bg-surface-soft p-6">
            <p className="mb-5 text-sm text-text-muted">Tap every subject you study — this filters the shelves below down to just yours.</p>
            <div className="space-y-6">
              {faculties.map((faculty) => (
                <div key={faculty.name}>
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-text-dim">{faculty.name}</h4>
                  <div className="flex flex-wrap gap-2">
                    {faculty.subjects.map((subject) => (
                      <SubjectChip
                        key={subject.name}
                        subject={subject}
                        faculty={faculty}
                        picked={mySubjects.includes(subject.name)}
                        onToggle={toggleSubject}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Faculties → subject shelves */}
        {filterActive && mySubjects.length === 0 ? (
          <div className="reveal rounded-2xl border border-dashed border-line-soft bg-surface-soft p-12 text-center">
            <p className="font-display text-xl font-bold text-text-primary">No subjects picked yet</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-text-muted">Choose the subjects you study and this shelf will filter down to just them.</p>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="mt-6 rounded-full bg-accent px-5 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
            >
              Choose your subjects
            </button>
          </div>
        ) : (
          <div className="space-y-16">
            {visibleFaculties.map((faculty) => (
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
        )}

      </div>
    </div>
  );
};

export default Library;
