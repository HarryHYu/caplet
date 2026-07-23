import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AcademicCapIcon, ArrowRightIcon, BookOpenIcon } from '@heroicons/react/24/outline';
import { useReveal } from '../lib/useReveal';
import { useMySubjects } from '../lib/useMySubjects';
import { useLearningHubData } from '../lib/useLearningHubData';
import { useAuth } from '../contexts/AuthContext';
import Glyph from '../components/SubjectGlyph';
import LearningNextAction from '../components/learning/LearningNextAction';
import LearningToday from '../components/learning/LearningToday';
import ResumeLearningCard from '../components/learning/ResumeLearningCard';
import { LearningCard, LearningPageHeader, LearningSection } from '../components/learning/LearningChrome';
import { faculties } from '../data/hscSubjects';

/**
 * Resource Library — an HSC subject browser. Mostly a placeholder for now: the
 * shelves are laid out and each subject has its own hand-drawn glyph, but the
 * per-subject syllabus content is still being built, so most tiles carry a
 * "Soon" marker instead of a link. Subjects with `available: true` (see
 * data/hscSubjects) link through to their shelf at /library/:slug.
 */

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
  const { isAuthenticated } = useAuth();
  const { mySubjects, toggleSubject } = useMySubjects();
  const { data: hubData, loading: hubLoading } = useLearningHubData(isAuthenticated);
  const [filterActive, setFilterActive] = useState(() => mySubjects.length > 0);
  const [pickerOpen, setPickerOpen] = useState(false);

  const { availableFaculties, comingFaculties, availableCount } = useMemo(() => {
    const filterSubjects = (subjects) => filterActive ? subjects.filter((subject) => mySubjects.includes(subject.name)) : subjects;
    const available = faculties
      .map((faculty) => ({ ...faculty, subjects: filterSubjects(faculty.subjects.filter((subject) => subject.available)) }))
      .filter((faculty) => faculty.subjects.length > 0);
    const coming = faculties
      .map((faculty) => ({ ...faculty, subjects: filterSubjects(faculty.subjects.filter((subject) => !subject.available)) }))
      .filter((faculty) => faculty.subjects.length > 0);
    return {
      availableFaculties: available,
      comingFaculties: coming,
      availableCount: faculties.flatMap((faculty) => faculty.subjects).filter((subject) => subject.available).length,
    };
  }, [filterActive, mySubjects]);

  return (
    <div className="min-h-screen bg-surface-body pb-28 pt-24 selection:bg-accent selection:text-white md:pt-28">
      <div className="container-custom">
        <LearningPageHeader
          eyebrow="Your learning home"
          title="Learn"
          description="See your next useful step, return to saved work, or explore the subjects and structured paths available in Caplet."
          className="reveal mb-10"
        />

        {isAuthenticated && hubData.todayActions.length > 0 ? (
          <LearningToday actions={hubData.todayActions} source="learn_hub" className="reveal mb-12" />
        ) : (
          <LearningNextAction {...hubData.nextAction} source="learn_hub" trackingEnabled={isAuthenticated} className="reveal mb-12" />
        )}

        {hubData.partialErrors.length > 0 && (
          <div role="status" className="mb-10 rounded-2xl bg-surface-error px-5 py-4 text-sm font-bold text-text-error">
            Some personalised learning information is temporarily unavailable. Everything else below is ready to use.
          </div>
        )}

        {isAuthenticated && hubData.continueItems.length > 0 && (
          <LearningSection eyebrow="Saved progress" title="Continue learning" description="Return to the exact course, practice, or exam session you last used." className="reveal mb-16">
            <div className="grid gap-4 lg:grid-cols-2">
              {hubData.continueItems.slice(0, 4).map((item) => <ResumeLearningCard key={item.id} href={item.href} title={item.title} detail={item.detail} progress={item.progress} />)}
            </div>
          </LearningSection>
        )}

        <LearningSection
          eyebrow="Ready now"
          title="Available subjects"
          description={`${availableCount} complete subject library is available today. Keep your shortlist focused on what you actually study.`}
          className="reveal mb-16"
          action={<Link to="/library/economics" className="inline-flex min-h-11 items-center gap-2 rounded-xl text-sm font-extrabold text-accent">Open Economics <ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></Link>}
        >
          <div className="mb-8 flex flex-wrap items-center gap-3">
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

          {pickerOpen && (
          <div className="mb-8 rounded-2xl border border-line-soft bg-surface-soft p-6">
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
          <div>
              {availableFaculties.length ? <div className="space-y-10">{availableFaculties.map((faculty) => (
                <div key={faculty.name}>
                  <div className="mb-5 flex items-center gap-4"><h3 className="font-display text-lg font-bold tracking-tight text-text-primary">{faculty.name}</h3><span className={`${faculty.block} ${faculty.text} rounded-full px-3 py-1 text-xs font-bold`}>{faculty.subjects.length}</span></div>
                  <div className="reveal-stagger grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{faculty.subjects.map((subject) => <LearningCard key={subject.name} title={subject.name} description={subject.tag} href={`/library/${subject.slug}`} kind={`${faculty.name} subject`} metadata={['Year 11–12', 'Syllabus-mapped']} status="Available" icon={BookOpenIcon} actionLabel="Explore subject" />)}</div>
                </div>
              ))}</div> : <div className="rounded-2xl border border-dashed border-line-soft bg-surface-soft p-8"><p className="font-display text-xl font-bold text-text-primary">None of your selected subjects are available yet.</p><p className="mt-2 text-sm text-text-muted">Open all subjects to study Economics now, or keep your choices saved while the next libraries are prepared.</p><button type="button" onClick={() => setFilterActive(false)} className="btn-secondary mt-5">Show available subjects</button></div>}
          </div>
        )}
        </LearningSection>

        <LearningSection eyebrow="Structured study" title="Learning paths" description="Follow lessons in order and resume from the exact point you stopped." className="reveal mb-16" action={<Link to="/courses" className="inline-flex min-h-11 items-center gap-2 rounded-xl text-sm font-extrabold text-accent">Browse all paths <ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></Link>}>
          {hubData.learningPaths.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {hubData.learningPaths.slice(0, 6).map((path) => <LearningCard key={path.id} {...path} icon={AcademicCapIcon} status={path.status === 'completed' ? 'Complete' : path.status === 'in_progress' ? 'In progress' : undefined} actionLabel={path.status === 'in_progress' ? 'Continue path' : 'Open path'} />)}
            </div>
          ) : (
            <div className="rounded-3xl block-blue p-7 md:p-9">
              <AcademicCapIcon className="h-9 w-9 text-accent" aria-hidden="true" />
              <h3 className="mt-5 font-display text-2xl font-extrabold tracking-tight text-text-primary">Structured paths are being prepared.</h3>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-text-muted">Economics topics, diagnostic practice, feedback, and mastery are ready while the first complete course path is assembled.</p>
              <Link to="/library/economics" className="btn-primary mt-6 w-fit">Study Economics <ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></Link>
            </div>
          )}
        </LearningSection>

        {comingFaculties.length > 0 && (
          <details className="reveal rounded-3xl border border-line-soft bg-surface-soft p-6 md:p-8">
            <summary className="cursor-pointer list-none rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
              <span className="section-kicker">Transparent roadmap</span>
              <span className="flex items-center justify-between gap-4"><span className="font-display text-2xl font-extrabold tracking-tight text-text-primary">Coming next</span><span className="text-sm font-bold text-text-muted">{hubData.comingSubjects.length} subjects</span></span>
              <span className="mt-2 block max-w-2xl text-sm font-medium text-text-muted">Planned subject libraries are kept secondary until they contain a complete student learning experience.</span>
            </summary>
            <div className="mt-6 space-y-6 border-t border-line-soft pt-6">{comingFaculties.map((faculty) => <div key={faculty.name}><h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-text-dim">{faculty.name}</h3><div className="flex flex-wrap gap-2">{faculty.subjects.map((subject) => <span key={subject.name} className="inline-flex items-center gap-2 rounded-full border border-line-soft bg-surface-raised px-3 py-2 text-sm font-bold text-text-muted"><Glyph className="h-4 w-4">{subject.glyph}</Glyph>{subject.name}</span>)}</div></div>)}</div>
          </details>
        )}

        {hubLoading && <p className="sr-only" role="status">Loading personalised learning information</p>}

      </div>
    </div>
  );
};

export default Library;
