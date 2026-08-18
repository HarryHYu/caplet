import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  AcademicCapIcon,
  ArrowRightIcon,
  ArrowTopRightOnSquareIcon,
  BookOpenIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ClipboardDocumentCheckIcon,
} from '@heroicons/react/24/outline';
import {
  economicsOutcomes,
  economicsResourceLibrary,
  getExamPackMarkableQuestions,
  getEconomicsAreaResources,
} from '../data/economicsResourceLibrary';
import EconomicsNextAction from '../components/learning/EconomicsNextAction';
import { LearningCard, LearningPageHeader, LearningSection } from '../components/learning/LearningChrome';

const typeLabels = {
  all: 'All resources',
  topicDrill: 'Topic drills',
  multipleChoice: 'Multiple choice',
  shortAnswer: 'Short answer',
  extendedResponse: 'Extended response',
  stimulusSet: 'Stimulus sets',
};

function OutcomeChip({ code }) {
  return (
    <span
      title={economicsOutcomes[code]}
      className="inline-flex items-center rounded-md border border-line-soft bg-surface-soft px-2.5 py-1 text-xs font-bold text-text-muted"
    >
      {code}
    </span>
  );
}

function ExamObjectiveItem({ item, index }) {
  return (
    <div className="rounded-md border border-line-soft bg-surface-soft p-4">
      <div className="mb-3 flex items-start gap-3">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-surface-raised text-xs font-extrabold text-text-muted">
          {index + 1}
        </span>
        <p className="text-sm font-extrabold leading-relaxed text-text-primary">{item.stem}</p>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {item.options.map((option, optionIndex) => (
          <div key={option} className="flex gap-2 text-sm leading-relaxed text-text-muted">
            <span className="font-extrabold text-text-primary">{String.fromCharCode(65 + optionIndex)}.</span>
            <span>{option}</span>
          </div>
        ))}
      </div>
      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-extrabold text-text-primary">Show answer</summary>
        <p className="mt-2 text-sm font-semibold text-accent">Answer: {item.answer}</p>
        <p className="mt-1 text-sm leading-relaxed text-text-muted">{item.explanation}</p>
      </details>
      <div className="mt-3 flex flex-wrap gap-2">
        {item.outcomes.map((code) => (
          <OutcomeChip key={code} code={code} />
        ))}
      </div>
    </div>
  );
}

function ExamConstructedItem({ item }) {
  return (
    <div className="rounded-md border border-line-soft bg-surface-soft p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <h4 className="text-sm font-extrabold leading-relaxed text-text-primary">{item.title}</h4>
        {item.marks ? (
          <span className="rounded-md bg-surface-raised px-2 py-1 text-xs font-extrabold text-text-muted">
            {item.marks} marks
          </span>
        ) : null}
      </div>

      {item.stimulus ? (
        <p className="mb-3 rounded-md border border-line-soft bg-surface-raised px-3 py-2 text-sm font-medium leading-relaxed text-text-muted">
          {item.stimulus}
        </p>
      ) : null}

      {item.prompt ? <p className="text-sm font-bold leading-relaxed text-text-primary">{item.prompt}</p> : null}

      {item.parts ? (
        <div className="grid gap-3">
          {item.parts.map((part) => (
            <div key={part.prompt} className="rounded-md border border-line-soft bg-surface-raised p-3">
              <div className="mb-2 flex items-start justify-between gap-3">
                <p className="text-sm font-bold leading-relaxed text-text-primary">{part.prompt}</p>
                <span className="shrink-0 rounded-md bg-surface-soft px-2 py-1 text-xs font-extrabold text-text-muted">
                  {part.marks} marks
                </span>
              </div>
              <ul className="grid gap-1.5">
                {part.markingGuide.map((guide) => (
                  <li key={guide} className="flex gap-2 text-sm leading-relaxed text-text-muted">
                    <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <span>{guide}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}

      {item.planningFrame ? (
        <div className="mt-3">
          <div className="mb-2 text-xs font-extrabold uppercase tracking-wide text-text-dim">Planning frame</div>
          <div className="grid gap-2">
            {item.planningFrame.map((step) => (
              <p key={step} className="rounded-md border border-line-soft bg-surface-raised px-3 py-2 text-sm leading-relaxed text-text-muted">
                {step}
              </p>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {item.outcomes.map((code) => (
          <OutcomeChip key={code} code={code} />
        ))}
      </div>
    </div>
  );
}

function ExamPracticePackCard({ pack, detail = false }) {
  const startableQuestions = getExamPackMarkableQuestions(pack);
  return (
    <article className="rounded-lg border border-line-soft bg-surface-raised p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-extrabold uppercase tracking-wide text-text-dim">{pack.syllabus}</div>
          <h3 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-text-primary">{pack.title}</h3>
          <p className="mt-2 max-w-4xl text-sm font-medium leading-relaxed text-text-muted">{pack.description}</p>
        </div>
        <div className="rounded-md bg-accent-soft px-3 py-2 text-sm font-extrabold text-accent">
          {pack.totalMarks} marks
        </div>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-md border border-line-soft bg-surface-soft p-3">
          <div className="text-xs font-extrabold uppercase tracking-wide text-text-dim">Audience</div>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-text-primary">{pack.audience}</p>
        </div>
        <div className="rounded-md border border-line-soft bg-surface-soft p-3">
          <div className="text-xs font-extrabold uppercase tracking-wide text-text-dim">Timing</div>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-text-primary">{pack.time}</p>
        </div>
      </div>

      <p className="mb-4 rounded-md border border-line-soft bg-surface-soft px-4 py-3 text-sm font-medium leading-relaxed text-text-muted">
        {pack.transitionNote}
      </p>

      {startableQuestions.length ? (
        <Link to={`/library/economics/exam-practice/${pack.id}/session`} className="focus-ring press mb-5 inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-extrabold text-accent-contrast hover:bg-accent-strong">
          Start {startableQuestions.length}-response practice <ClipboardDocumentCheckIcon className="h-4 w-4" />
        </Link>
      ) : (
        <p className="mb-5 inline-flex rounded-xl bg-surface-soft px-4 py-3 text-sm font-bold text-text-muted">
          Written session coming later — pack contents are available to browse.
        </p>
      )}

      {!detail ? <Link to={`/library/economics/exam-practice/${pack.id}`} className="focus-ring press mb-5 ml-3 inline-flex items-center gap-2 rounded-xl border border-line-soft bg-surface-raised px-5 py-3 text-sm font-extrabold text-text-primary hover:border-accent hover:text-accent">Browse pack contents <ArrowRightIcon className="h-4 w-4" /></Link> : null}

      {detail ? <>
      <div className="grid gap-3">
        {pack.sections.map((section) => (
          <details key={section.label} className="rounded-md border border-line-soft bg-surface-soft px-4 py-3">
            <summary className="cursor-pointer">
              <span className="flex flex-wrap items-center justify-between gap-3">
                <span>
                  <span className="text-sm font-extrabold text-text-primary">{section.label}</span>
                  <span className="ml-2 text-sm font-medium text-text-muted">{section.format}</span>
                </span>
                <span className="text-xs font-extrabold text-accent">{section.marks} marks</span>
              </span>
            </summary>

            {section.sampleItems ? (
              <div className="mt-4">
                <div className="mb-3 text-xs font-extrabold uppercase tracking-wide text-text-dim">
                  {section.sampleItems.length} worked objective items from a {section.itemCount}-item section
                </div>
                <div className="grid gap-3">
                  {section.sampleItems.map((item, index) => (
                    <ExamObjectiveItem key={item.stem} item={item} index={index} />
                  ))}
                </div>
              </div>
            ) : null}

            {section.items ? (
              <div className="mt-4 grid gap-3">
                {section.items.map((item) => (
                  <ExamConstructedItem key={item.title} item={item} />
                ))}
              </div>
            ) : null}
          </details>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <div className="mb-2 text-xs font-extrabold uppercase tracking-wide text-text-dim">Marker brief</div>
          <ul className="grid gap-2">
            {pack.markerBrief.map((brief) => (
              <li key={brief} className="flex gap-2 text-sm leading-relaxed text-text-muted">
                <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <span>{brief}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="mb-2 text-xs font-extrabold uppercase tracking-wide text-text-dim">Official anchors</div>
          <div className="grid gap-2">
            {pack.sourceLinks.map((source) => (
              <a
                key={source.url}
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-between gap-3 rounded-md border border-line-soft bg-surface-soft px-3 py-2 text-sm font-bold text-text-primary hover:border-accent hover:text-accent"
              >
                <span>{source.title}</span>
                <ArrowTopRightOnSquareIcon className="h-4 w-4 shrink-0" />
              </a>
            ))}
          </div>
        </div>
      </div>
      </> : null}
    </article>
  );
}

function ExamPracticePacksSection({ detail = false }) {
  return (
    <section className="mb-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-extrabold uppercase tracking-wide text-text-dim">Exam practice packs</div>
          <h2 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-text-primary">
            Paper-style preparation for the transition and new syllabus
          </h2>
        </div>
        <span className="rounded-md border border-line-soft bg-surface-raised px-3 py-2 text-sm font-extrabold text-text-muted">
          {economicsResourceLibrary.examPracticePacks.length} packs
        </span>
      </div>
      <div className="grid gap-5">
        {economicsResourceLibrary.examPracticePacks.map((pack) => (
          <ExamPracticePackCard key={pack.id} pack={pack} detail={detail} />
        ))}
      </div>
    </section>
  );
}

const economicsPages = [
  { to: '/library/economics/year-11', icon: BookOpenIcon, eyebrow: 'Year 11', title: 'Foundations', body: 'Build the models, vocabulary and economic thinking that underpin every later topic.' },
  { to: '/library/economics/year-12', icon: AcademicCapIcon, eyebrow: 'Year 12', title: 'HSC course', body: 'Practise economic issues, policy management and Australia in the global economy.' },
  { to: '/library/economics/exam-practice', icon: ClipboardDocumentCheckIcon, eyebrow: 'Timed practice', title: 'Exam packs', body: 'Work through paper-style questions, marking prompts and official anchors.' },
  { to: '/library/economics/assessment', icon: ChartBarIcon, eyebrow: 'Plan smarter', title: 'Assessment guide', body: 'See the HSC paper shape, school weighting and official syllabus links.' },
];

function BackLink({ to, children }) {
  return <Link to={to} className="focus-ring mb-7 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-bold text-text-muted transition-colors hover:text-accent"><span aria-hidden="true">←</span>{children}</Link>;
}

function EconomicsHub() {
  return (
    <div className="min-h-screen bg-surface-body pb-28 pt-24 text-text-primary selection:bg-accent selection:text-accent-contrast md:pt-28">
      <div className="container-custom">
        <BackLink to="/library">Learn</BackLink>
        <LearningPageHeader eyebrow="Available subject" title="Economics" description="Choose a year level, follow your recommended practice, work through an exam pack, or check how the HSC course is assessed." className="mb-10" />

        <EconomicsNextAction source="library_hub" className="mb-10" />

        <LearningSection eyebrow="Explore the subject" title="Choose your route" description="Year content, timed practice, and assessment guidance use one consistent learning hierarchy.">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {economicsPages.map((page) => <LearningCard key={page.to} title={page.title} description={page.body} href={page.to} kind={page.eyebrow} icon={page.icon} actionLabel="Open" />)}
          </div>
        </LearningSection>
      </div>
    </div>
  );
}

const assessmentPages = [
  { id: 'exam-structure', eyebrow: 'External exam', title: 'Paper structure', body: 'See sections, marks and timing before choosing how to practise.' },
  { id: 'school-assessment', eyebrow: 'School tasks', title: 'Assessment weighting', body: 'Understand the components your school assessments are built around.' },
  { id: 'official-sources', eyebrow: 'Reference', title: 'Official sources', body: 'Open the syllabus, assessment and standards links in one clean place.' },
];

function AssessmentPage() {
  return (
    <div className="min-h-screen bg-surface-body pb-20 pt-24 text-text-primary selection:bg-accent selection:text-accent-contrast">
      <div className="container-custom">
        <BackLink to="/library/economics">Economics</BackLink>
        <section className="mb-8 max-w-3xl">
          <p className="text-sm font-extrabold uppercase tracking-wide text-accent">Assessment guide</p>
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight md:text-5xl">Know what the course asks of you.</h1>
          <p className="mt-4 text-base font-medium leading-relaxed text-text-muted">Use this as a planning reference for HSC-style practice and school assessments. Check the official links below for the current rules.</p>
        </section>
        <section className="grid gap-4 md:grid-cols-3">{assessmentPages.map((page) => <Link key={page.id} to={`/library/economics/assessment/${page.id}`} className="card-lift focus-ring group rounded-2xl border border-line-soft bg-surface-raised p-6 hover:border-accent"><p className="text-xs font-extrabold uppercase tracking-wide text-text-dim">{page.eyebrow}</p><h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight group-hover:text-accent">{page.title}</h2><p className="mt-3 text-sm font-medium leading-relaxed text-text-muted">{page.body}</p><span className="mt-6 inline-flex items-center gap-1 text-sm font-extrabold text-accent">Open <ArrowRightIcon className="h-4 w-4" /></span></Link>)}</section>
      </div>
    </div>
  );
}

function AssessmentDetailPage({ pageId }) {
  const assessment = economicsResourceLibrary.assessmentBlueprint;
  const page = assessmentPages.find((item) => item.id === pageId);
  if (!page) return <AssessmentPage />;
  return <main className="min-h-screen bg-surface-body pb-20 pt-24 text-text-primary"><div className="container-custom max-w-5xl"><BackLink to="/library/economics/assessment">Assessment guide</BackLink><header className="mb-8 max-w-3xl"><p className="text-sm font-extrabold uppercase tracking-wide text-accent">{page.eyebrow}</p><h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight md:text-5xl">{page.title}</h1></header>{pageId === 'exam-structure' ? <section className="rounded-2xl border border-line-soft bg-surface-raised p-6 md:p-8"><div className="mb-6 flex items-end justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-wide text-text-dim">External examination</p><p className="mt-2 text-sm font-bold text-text-muted">{assessment.externalExam.time}</p></div><span className="rounded-lg bg-accent-soft px-3 py-2 text-sm font-extrabold text-accent">{assessment.externalExam.totalMarks} marks</span></div><div className="grid gap-3 md:grid-cols-2">{assessment.externalExam.sections.map((section) => <div key={section.label} className="rounded-xl border border-line-soft bg-surface-soft p-5"><div className="flex justify-between gap-3"><span className="font-extrabold">{section.label}</span><span className="font-extrabold text-accent">{section.marks} marks</span></div><p className="mt-2 text-sm leading-relaxed text-text-muted">{section.format}</p></div>)}</div></section> : null}{pageId === 'school-assessment' ? <section className="grid gap-4 md:grid-cols-3">{assessment.schoolAssessmentComponents.map((component) => <div key={component.component} className="rounded-2xl border border-line-soft bg-surface-raised p-6"><div className="flex justify-between gap-3"><span className="text-sm font-extrabold leading-snug">{component.component}</span><span className="text-sm font-extrabold text-accent">{component.weighting}%</span></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-surface-soft"><div className="h-full rounded-full bg-accent" style={{ width: `${component.weighting}%` }} /></div></div>)}</section> : null}{pageId === 'official-sources' ? <OfficialSources /> : null}</div></main>;
}

function OfficialSources() {
  return <section className="rounded-xl border border-line-soft bg-surface-raised p-5"><p className="text-xs font-extrabold uppercase tracking-wide text-text-dim">Official source links</p><div className="mt-4 grid gap-3 md:grid-cols-2">{economicsResourceLibrary.officialSources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="rounded-lg border border-line-soft bg-surface-soft p-4 hover:border-accent"><span className="flex items-start justify-between gap-3"><span className="text-sm font-extrabold leading-snug text-text-primary">{source.title}</span><ArrowTopRightOnSquareIcon className="h-4 w-4 shrink-0 text-accent" /></span><span className="mt-2 block text-xs font-medium leading-relaxed text-text-muted">{source.note}</span></a>)}</div></section>;
}

function YearPage({ year }) {
  const areas = economicsResourceLibrary.focusAreas.filter((area) => area.year === year);
  return (
    <main className="min-h-screen bg-surface-body pb-28 pt-24 text-text-primary md:pt-28">
      <div className="container-custom max-w-6xl">
        <BackLink to="/library/economics">Economics</BackLink>
        <LearningPageHeader eyebrow={`Year ${year}`} title={year === 11 ? 'Build the economic toolkit.' : 'Practise the HSC course.'} description="Use the recommended next action or choose a topic. Each topic shows its complete activity set before you begin." className="mb-10" />
        <EconomicsNextAction source={`library_year_${year}`} className="mb-10" />
        <LearningSection eyebrow="Syllabus topics" title="Choose a topic" description={`${areas.length} focused topic areas are available for Year ${year}.`}>
          <div className="grid gap-4 md:grid-cols-2">
            {areas.map((area) => {
            const resourceCount = getEconomicsAreaResources(area).length;
            return <LearningCard key={area.id} title={area.title} description={area.description} href={`/library/economics/focus/${area.id}`} kind={area.focus} metadata={[`${resourceCount} activities`, ...(area.outcomes || []).slice(0, 2)]} icon={BookOpenIcon} actionLabel={`Open ${resourceCount} activities`} />;
            })}
          </div>
        </LearningSection>
      </div>
    </main>
  );
}

function PracticePlayer({ area }) {
  const [searchParams] = useSearchParams();
  const requestedResourceId = searchParams.get('resource');
  const resources = getEconomicsAreaResources(area);
  const counts = resources.reduce((result, resource) => ({ ...result, [resource.type]: (result[resource.type] || 0) + 1 }), {});

  return (
    <main className="min-h-screen bg-surface-body pb-20 pt-24 text-text-primary">
      <div className="mx-auto max-w-4xl px-6 md:px-10">
        <BackLink to={`/library/economics/year-${area.year}`}>Year {area.year} topics</BackLink>
        <LearningPageHeader eyebrow={area.focus} title={area.title} description={area.description} className="mb-8" />

        <EconomicsNextAction source="library" focusId={area.id} resourceId={requestedResourceId || ''} mode="daily" />

        <section className="mt-8 rounded-3xl border border-line-soft bg-surface-raised p-6 md:p-8" aria-labelledby="practice-coverage-heading"><p className="section-kicker">Saved and evidence-backed</p><h2 id="practice-coverage-heading" className="font-display text-2xl font-extrabold tracking-tight">What this practice set covers</h2><p className="mt-2 text-sm font-medium leading-relaxed text-text-muted">Answers now run through the same saved practice session, feedback, and mastery profile as diagnostics and revision.</p><div className="mt-6 grid gap-3 sm:grid-cols-2">{Object.entries(counts).map(([type, count]) => <div key={type} className="flex items-center justify-between rounded-xl bg-surface-soft px-4 py-3"><span className="text-sm font-bold text-text-primary">{typeLabels[type] || type}</span><span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-extrabold text-accent">{count}</span></div>)}</div><div className="mt-6 flex flex-wrap gap-2">{area.outcomes.map((code) => <OutcomeChip key={code} code={code} />)}</div></section>
      </div>
    </main>
  );
}

function ExamPracticePage() {
  return <main className="min-h-screen bg-surface-body pb-20 pt-24 text-text-primary"><div className="container-custom max-w-5xl"><BackLink to="/library/economics">Economics</BackLink><section className="mb-10 max-w-3xl"><p className="text-sm font-extrabold uppercase tracking-wide text-accent">Timed practice</p><h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight md:text-5xl">Choose an exam pack.</h1><p className="mt-4 text-base font-medium leading-relaxed text-text-muted">Open a pack to browse its sections, or begin a focused timed written session straight away.</p></section><ExamPracticePacksSection /></div></main>;
}

function ExamPackDetailPage({ pack }) {
  return <main className="min-h-screen bg-surface-body pb-20 pt-24 text-text-primary"><div className="container-custom max-w-5xl"><BackLink to="/library/economics/exam-practice">Exam practice</BackLink><ExamPracticePackCard pack={pack} detail /></div></main>;
}

export default function ResourceLibrary() {
  const { section, focusId } = useParams();
  const area = economicsResourceLibrary.focusAreas.find((item) => item.id === focusId);

  if (!section) return <EconomicsHub />;
  if (section === 'year-11') return <YearPage year={11} />;
  if (section === 'year-12') return <YearPage year={12} />;
  if (section === 'exam-practice' && focusId) {
    const pack = economicsResourceLibrary.examPracticePacks.find((item) => item.id === focusId);
    return pack ? <ExamPackDetailPage pack={pack} /> : <ExamPracticePage />;
  }
  if (section === 'exam-practice') return <ExamPracticePage />;
  if (section === 'assessment' && focusId) return <AssessmentDetailPage pageId={focusId} />;
  if (section === 'assessment') return <AssessmentPage />;
  if (section === 'focus' && area) return <PracticePlayer area={area} />;
  return <EconomicsHub />;
}
