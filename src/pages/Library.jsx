import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon, CheckIcon, ChevronDownIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useReveal } from '../lib/useReveal';
import { useMySubjects } from '../lib/useMySubjects';
import { useLearningHubData } from '../lib/useLearningHubData';
import { useAuth } from '../contexts/AuthContext';
import LearningNextAction from '../components/learning/LearningNextAction';
import ResumeLearningCard from '../components/learning/ResumeLearningCard';
import { LearningPageHeader, LearningSection } from '../components/learning/LearningChrome';
import { InlineEmpty } from '../components/learning/LearningStates';
import { faculties } from '../data/hscSubjects';
import Glyph from '../components/SubjectGlyph';

/**
 * Resource Library — an HSC subject browser. The full catalogue is visible so
 * students can find their subject in one place. Subjects with `available: true`
 * (see data/hscSubjects) link through to their shelf at /library/:slug.
 */

const LibrarySubjectCard = ({ subject, faculty }) => {
  const isAvailable = subject.available === true;
  const classes = `group flex items-center gap-4 rounded-2xl border border-line-soft bg-surface-raised p-4 shadow-card transition-colors ${
    isAvailable ? 'card-lift focus-ring hover:border-accent/50 hover:shadow-card-hover' : 'opacity-70'
  }`;
  const content = (
    <>
      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${faculty?.block || 'bg-surface-soft'} ${faculty?.text || 'text-text-muted'}`} aria-hidden="true">
        <Glyph className="h-6 w-6">{subject.glyph}</Glyph>
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-bold uppercase tracking-[0.11em] text-text-dim" aria-hidden="true">{faculty?.name}</p>
        <h3 className="mt-0.5 font-display text-lg font-bold leading-tight tracking-tight text-text-primary transition-colors group-hover:text-accent">{subject.name}</h3>
      </div>
      {isAvailable && (
        <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-bold text-accent">
          Open <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </span>
      )}
    </>
  );

  if (!isAvailable) return <div className={classes} aria-disabled="true">{content}</div>;
  return <Link to={`/library/${subject.slug}`} className={classes}>{content}</Link>;
};

const LibraryCourseCard = ({ path }) => {
  const metadata = (path.metadata || []).filter(Boolean).join(' · ');
  const progress = Number(path.progress);
  const actionLabel = path.status === 'in_progress' ? 'Continue' : 'Open';

  return (
    <Link to={path.href} className="card-lift focus-ring group flex min-h-full flex-col justify-between rounded-2xl border border-line-soft bg-surface-raised p-5 shadow-card transition-colors hover:border-accent/50 hover:bg-surface-soft hover:shadow-card-hover">
      <div>
        <h3 className="font-display text-xl font-bold tracking-tight text-text-primary transition-colors group-hover:text-accent">{path.title}</h3>
        {path.description && <p className="mt-2 text-sm font-medium leading-relaxed text-text-muted">{path.description}</p>}
        {metadata && <p className="mt-4 text-xs font-bold text-text-dim">{metadata}</p>}
        {Number.isFinite(progress) && progress > 0 && (
          <div className="mt-4">
            <div className="mb-2 flex justify-between text-xs font-bold text-text-muted"><span>Progress</span><span>{Math.round(progress)}%</span></div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-soft" role="progressbar" aria-label={`${path.title} progress`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(progress)}>
              <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
            </div>
          </div>
        )}
      </div>
      <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-accent">
        {actionLabel} <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
      </span>
    </Link>
  );
};

const Library = () => {
  useReveal();
  const { isAuthenticated } = useAuth();
  const { mySubjects, toggleSubject } = useMySubjects();
  const { data: hubData, loading: hubLoading } = useLearningHubData(isAuthenticated);
  const [filterActive, setFilterActive] = useState(() => mySubjects.length > 0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [subjectQuery, setSubjectQuery] = useState('');

  const allSubjects = useMemo(
    () => faculties.flatMap((faculty) => faculty.subjects.map((subject) => ({ ...subject, faculty }))),
    [],
  );
  const matchingSubjects = useMemo(() => {
    const query = subjectQuery.trim().toLowerCase();
    return allSubjects.filter((subject) => !query || subject.name.toLowerCase().includes(query));
  }, [allSubjects, subjectQuery]);
  const visibleSubjects = useMemo(() => matchingSubjects.filter((subject) => !filterActive || mySubjects.includes(subject.name)), [filterActive, matchingSubjects, mySubjects]);

  const continueItems = hubData.continueItems.filter((item) => item.href !== hubData.nextAction.resume?.href);

  return (
    <div className="min-h-screen bg-surface-body pb-28 pt-24 selection:bg-accent selection:text-accent-contrast md:pt-28">
      <div className="container-custom">
        <LearningPageHeader
          title="Resource library"
          description="Choose a subject, or return to something you were already learning."
          className="reveal mb-8"
        />

        <LearningNextAction
          {...hubData.nextAction}
          source="learn_hub"
          trackingEnabled={isAuthenticated}
          variant="minimal"
          className="reveal mb-10"
        />

        {hubData.partialErrors.length > 0 && (
          <div role="status" className="animate-rise mb-10 rounded-2xl bg-surface-error px-5 py-4 text-sm font-bold text-text-error">
            Some saved learning information is unavailable right now. You can still browse subjects.
          </div>
        )}

        {isAuthenticated && continueItems.length > 0 && (
          <LearningSection title="Continue learning" className="reveal mb-14">
            <div className="grid gap-4 lg:grid-cols-2">
              {continueItems.slice(0, 4).map((item) => <ResumeLearningCard key={item.id} href={item.href} title={item.title} detail={item.detail} progress={item.progress} variant="minimal" />)}
            </div>
          </LearningSection>
        )}

        <LearningSection
          title="Subjects"
          className="reveal mb-16"
        >
          <div className="mb-8 flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-full border border-line-soft bg-surface-raised p-1">
              <button
                type="button"
                onClick={() => setFilterActive(false)}
                aria-pressed={!filterActive}
                className={`focus-ring press rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${!filterActive ? 'bg-accent text-accent-contrast' : 'text-text-muted hover:text-text-primary'}`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilterActive(true)}
                aria-pressed={filterActive}
                className={`focus-ring press rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${filterActive ? 'bg-accent text-accent-contrast' : 'text-text-muted hover:text-text-primary'}`}
              >
                My subjects
              </button>
            </div>
            <button
              type="button"
              onClick={() => setPickerOpen((value) => !value)}
              aria-expanded={pickerOpen}
              aria-controls="subject-picker"
              className="focus-ring press inline-flex items-center gap-2 rounded-full border border-line-soft bg-surface-raised px-4 py-1.5 text-sm font-bold text-text-muted transition-colors hover:text-accent"
            >
              Choose subjects <ChevronDownIcon className={`h-4 w-4 transition-transform ${pickerOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {pickerOpen && (
            <div id="subject-picker" className="mb-8 max-w-2xl rounded-2xl border border-line-soft bg-surface-raised p-4 shadow-pop">
              <label htmlFor="subject-search" className="sr-only">Search subjects</label>
              <div className="relative">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-dim" />
                <input id="subject-search" type="search" value={subjectQuery} onChange={(event) => setSubjectQuery(event.target.value)} autoFocus placeholder="Search subjects" className="min-h-12 w-full rounded-xl border border-line-soft bg-surface-soft py-3 pl-12 pr-4 text-sm font-bold text-text-primary outline-none placeholder:font-medium placeholder:text-text-dim focus:border-accent focus:ring-4 focus:ring-accent-soft" />
              </div>
              {mySubjects.length > 0 && <div className="mt-3 flex flex-wrap gap-2" aria-label="Selected subjects">{mySubjects.map((name) => <button key={name} type="button" onClick={() => toggleSubject(name)} className="focus-ring press inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 text-xs font-bold text-accent">{name}<XMarkIcon className="h-3.5 w-3.5" /></button>)}</div>}
              <div role="listbox" aria-label="Subject search results" aria-multiselectable="true" className="mt-3 max-h-72 overflow-y-auto rounded-xl border border-line-soft bg-surface-body p-1">
                {matchingSubjects.map((subject) => {
                  const selected = mySubjects.includes(subject.name);
                  return <button key={subject.name} type="button" role="option" aria-selected={selected} onClick={() => toggleSubject(subject.name)} className={`focus-ring flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-bold transition-colors ${selected ? 'bg-accent-soft text-accent' : 'text-text-primary hover:bg-surface-soft'}`}><span>{subject.name}</span>{selected && <CheckIcon className="h-4 w-4 shrink-0" />}</button>;
                })}
                {!matchingSubjects.length && <p className="px-3 py-8 text-center text-sm text-text-muted">No subjects match “{subjectQuery}”.</p>}
              </div>
              <div className="mt-3 flex justify-end"><button type="button" onClick={() => { setPickerOpen(false); setSubjectQuery(''); }} className="btn-primary min-h-10 px-4 py-2">Done</button></div>
            </div>
          )}

          {filterActive && mySubjects.length === 0 ? (
            <InlineEmpty
              className="animate-rise"
              icon={CheckIcon}
              title="No subjects selected"
              message="Choose subjects to filter this list."
              action={<button type="button" onClick={() => setPickerOpen(true)} className="btn-primary">Choose subjects</button>}
            />
          ) : (
            <div>
              {visibleSubjects.length ? <div className="reveal-stagger grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{visibleSubjects.map((subject) => <LibrarySubjectCard key={subject.name} subject={subject} faculty={subject.faculty} />)}</div> : <InlineEmpty className="animate-rise" icon={MagnifyingGlassIcon} title="No matching subjects" message="Nothing on your shelf matches this filter yet." action={<button type="button" onClick={() => { setFilterActive(false); setSubjectQuery(''); }} className="btn-secondary focus-ring">Show all</button>} />}
            </div>
          )}
        </LearningSection>

        {hubData.learningPaths.length > 0 && (
          <LearningSection title="Courses" className="reveal mb-16" action={<Link to="/courses" className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl text-sm font-extrabold text-accent">View all <ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></Link>}>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {hubData.learningPaths.slice(0, 6).map((path) => <LibraryCourseCard key={path.id} path={path} />)}
            </div>
          </LearningSection>
        )}

        {hubLoading && <p className="sr-only" role="status">Loading personalised learning information</p>}

      </div>
    </div>
  );
};

export default Library;
