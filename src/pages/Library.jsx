import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { useReveal } from '../lib/useReveal';
import { useMySubjects } from '../lib/useMySubjects';
import { useLearningHubData } from '../lib/useLearningHubData';
import { useAuth } from '../contexts/AuthContext';
import LearningNextAction from '../components/learning/LearningNextAction';
import ResumeLearningCard from '../components/learning/ResumeLearningCard';
import { LearningPageHeader, LearningSection } from '../components/learning/LearningChrome';
import { faculties } from '../data/hscSubjects';

/**
 * Resource Library — an HSC subject browser. The full catalogue is visible so
 * students can find their subject in one place. Subjects with `available: true`
 * (see data/hscSubjects) link through to their shelf at /library/:slug.
 */

const SubjectChip = ({ subject, picked, onToggle }) => (
  <button
    type="button"
    onClick={() => onToggle(subject.name)}
    aria-pressed={picked}
    className={`rounded-full border px-3 py-1.5 text-sm font-bold transition-colors ${
      picked
        ? 'border-transparent bg-accent-soft text-accent'
        : 'border-line-soft bg-surface-raised text-text-muted hover:text-text-primary'
    }`}
  >
    {subject.name}
  </button>
);

const LibrarySubjectCard = ({ subject }) => {
  const isAvailable = subject.available === true;
  const classes = `group flex min-h-36 flex-col justify-between rounded-2xl border border-line-soft bg-surface-raised p-5 transition-colors ${
    isAvailable ? 'hover:border-accent/50 hover:bg-surface-soft' : 'opacity-75'
  }`;
  const content = (
    <>
      <div>
        <h4 className="font-display text-xl font-bold tracking-tight text-text-primary transition-colors group-hover:text-accent">{subject.name}</h4>
        {subject.tag && <p className="mt-2 text-sm font-medium text-text-muted">{subject.tag}</p>}
      </div>
      {isAvailable && (
        <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-accent">
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
    <Link to={path.href} className="group flex min-h-full flex-col justify-between rounded-2xl border border-line-soft bg-surface-raised p-5 transition-colors hover:border-accent/50 hover:bg-surface-soft">
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

  const { subjectFaculties } = useMemo(() => {
    const filterSubjects = (subjects) => filterActive ? subjects.filter((subject) => mySubjects.includes(subject.name)) : subjects;
    const visible = faculties
      .map((faculty) => ({ ...faculty, subjects: filterSubjects(faculty.subjects) }))
      .filter((faculty) => faculty.subjects.length > 0);
    return { subjectFaculties: visible };
  }, [filterActive, mySubjects]);

  const continueItems = hubData.continueItems.filter((item) => item.href !== hubData.nextAction.resume?.href);

  return (
    <div className="min-h-screen bg-surface-body pb-28 pt-24 selection:bg-accent selection:text-white md:pt-28">
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
          <div role="status" className="mb-10 rounded-2xl bg-surface-error px-5 py-4 text-sm font-bold text-text-error">
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
          description="Choose a subject to explore."
          className="reveal mb-16"
        >
          <div className="mb-8 flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-full border border-line-soft bg-surface-raised p-1">
              <button
                type="button"
                onClick={() => setFilterActive(false)}
                className={`rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${!filterActive ? 'bg-accent text-white' : 'text-text-muted hover:text-text-primary'}`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilterActive(true)}
                className={`rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${filterActive ? 'bg-accent text-white' : 'text-text-muted hover:text-text-primary'}`}
              >
                My subjects
              </button>
            </div>
            <button
              type="button"
              onClick={() => setPickerOpen((v) => !v)}
              className="rounded-full border border-line-soft bg-surface-raised px-4 py-1.5 text-sm font-bold text-text-muted transition-colors hover:text-accent"
            >
              {pickerOpen ? 'Done' : 'Choose subjects'}
            </button>
          </div>

          {pickerOpen && (
            <div className="mb-8 rounded-2xl border border-line-soft bg-surface-soft p-6">
              <p className="mb-5 text-sm text-text-muted">Choose the subjects you study to filter this list.</p>
              <div className="space-y-6">
                {faculties.map((faculty) => (
                  <div key={faculty.name}>
                    <h4 className="mb-2 text-sm font-bold text-text-primary">{faculty.name}</h4>
                    <div className="flex flex-wrap gap-2">
                      {faculty.subjects.map((subject) => (
                        <SubjectChip
                          key={subject.name}
                          subject={subject}
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

          {filterActive && mySubjects.length === 0 ? (
            <div className="reveal rounded-2xl border border-dashed border-line-soft bg-surface-soft p-12 text-center">
              <p className="font-display text-xl font-bold text-text-primary">No subjects selected</p>
              <p className="mx-auto mt-2 max-w-sm text-sm text-text-muted">Choose subjects to filter this list.</p>
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="mt-6 rounded-full bg-accent px-5 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
              >
                Choose subjects
              </button>
            </div>
          ) : (
            <div>
              {subjectFaculties.length ? <div className="space-y-9">{subjectFaculties.map((faculty) => (
                <div key={faculty.name}>
                  <h3 className="mb-3 font-display text-lg font-bold tracking-tight text-text-primary">{faculty.name}</h3>
                  <div className="reveal-stagger grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{faculty.subjects.map((subject) => <LibrarySubjectCard key={subject.name} subject={subject} />)}</div>
                </div>
              ))}</div> : <div className="rounded-2xl border border-dashed border-line-soft bg-surface-soft p-8"><p className="font-display text-xl font-bold text-text-primary">No matching subjects</p><button type="button" onClick={() => setFilterActive(false)} className="btn-secondary mt-5">Show all</button></div>}
            </div>
          )}
        </LearningSection>

        {hubData.learningPaths.length > 0 && (
          <LearningSection title="Courses" className="reveal mb-16" action={<Link to="/courses" className="inline-flex min-h-11 items-center gap-2 rounded-xl text-sm font-extrabold text-accent">View all <ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></Link>}>
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
