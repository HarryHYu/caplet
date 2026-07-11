import { createElement, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AcademicCapIcon,
  ArrowTopRightOnSquareIcon,
  BookOpenIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ClipboardDocumentCheckIcon,
} from '@heroicons/react/24/outline';
import {
  economicsOutcomes,
  economicsResourceLibrary,
  getEconomicsAreaResources,
} from '../data/economicsResourceLibrary';

const typeLabels = {
  all: 'All resources',
  topicDrill: 'Topic drills',
  multipleChoice: 'Multiple choice',
  shortAnswer: 'Short answer',
  extendedResponse: 'Extended response',
  stimulusSet: 'Stimulus sets',
};

const typeMeta = {
  topicDrill: { label: 'Drill', title: 'Topic Drill' },
  multipleChoice: { label: 'MCQ', title: 'Multiple Choice' },
  shortAnswer: { label: 'SA', title: 'Short Answer' },
  extendedResponse: { label: 'Essay', title: 'Extended Response' },
  stimulusSet: { label: 'Stimulus', title: 'Stimulus Set' },
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

function QuestionShell({ resource, children }) {
  const meta = typeMeta[resource.type];
  return (
    <article className="rounded-lg border border-line-soft bg-surface-raised p-5 shadow-[0_18px_40px_-34px_rgba(20,20,18,0.45)]">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-accent-soft px-2.5 py-1 text-xs font-extrabold text-accent">
          {meta.label}
        </span>
        <span className="text-xs font-bold uppercase tracking-wide text-text-dim">{resource.difficulty}</span>
        {resource.marks ? (
          <span className="text-xs font-bold uppercase tracking-wide text-text-dim">{resource.marks} marks</span>
        ) : null}
      </div>
      {children}
      <div className="mt-5 flex flex-wrap gap-2">
        {resource.outcomes.map((code) => (
          <OutcomeChip key={code} code={code} />
        ))}
      </div>
    </article>
  );
}

function MultipleChoiceResource({ resource }) {
  const [selected, setSelected] = useState('');
  const [checked, setChecked] = useState(false);

  return (
    <QuestionShell resource={resource}>
      <h2 className="text-xl font-bold leading-snug text-text-primary">{resource.stem}</h2>
      <div className="mt-4 grid gap-2">
        {resource.options.map((option, index) => {
          const letter = String.fromCharCode(65 + index);
          const isSelected = selected === letter;
          const isCorrect = checked && letter === resource.answer;
          const isWrong = checked && isSelected && letter !== resource.answer;
          return (
            <button
              key={option}
              type="button"
              disabled={checked}
              onClick={() => setSelected(letter)}
              className={`flex gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
                isCorrect ? 'border-emerald-500 bg-emerald-500/10' : isWrong ? 'border-red-500 bg-red-500/10' : isSelected ? 'border-accent bg-accent-soft' : 'border-line-soft bg-surface-soft hover:border-accent'
              }`}
            >
              <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-md text-xs font-extrabold ${isSelected ? 'bg-accent text-white' : 'bg-surface-raised text-text-muted'}`}>
                {letter}
              </span>
              <span className="text-sm font-medium leading-relaxed text-text-primary">{option}</span>
            </button>
          );
        })}
      </div>
      {!checked ? (
        <button type="button" disabled={!selected} onClick={() => setChecked(true)} className="mt-5 rounded-xl bg-accent px-5 py-3 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-40">
          Check answer
        </button>
      ) : (
        <div className="mt-5 rounded-lg bg-surface-soft p-4" role="status">
          <p className="font-extrabold text-text-primary">{selected === resource.answer ? 'Correct' : `The answer is ${resource.answer}`}</p>
          <p className="mt-2 text-sm leading-relaxed text-text-muted">{resource.explanation}</p>
        </div>
      )}
    </QuestionShell>
  );
}

function ShortAnswerResource({ resource }) {
  const [answer, setAnswer] = useState('');
  const [reviewing, setReviewing] = useState(false);

  return (
    <QuestionShell resource={resource}>
      <h2 className="text-xl font-bold leading-snug text-text-primary">{resource.question}</h2>
      {resource.stimulus ? (
        <p className="mt-3 rounded-md border border-line-soft bg-surface-soft px-4 py-3 text-sm font-medium leading-relaxed text-text-muted">
          {resource.stimulus}
        </p>
      ) : null}
      <textarea value={answer} onChange={(event) => setAnswer(event.target.value)} disabled={reviewing} rows={7} placeholder="Write your response here…" className="mt-5 w-full resize-y rounded-xl border border-line-soft bg-surface-soft p-4 text-sm leading-relaxed text-text-primary outline-none placeholder:text-text-dim focus:border-accent" />
      {!reviewing ? <button type="button" disabled={!answer.trim()} onClick={() => setReviewing(true)} className="mt-4 rounded-xl bg-accent px-5 py-3 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-40">Review response</button> : (
        <div className="mt-5 rounded-xl bg-surface-soft p-5">
          <p className="text-xs font-extrabold uppercase tracking-wide text-text-dim">Check for</p>
          <ul className="mt-3 grid gap-2">{resource.markingGuide.map((item) => <li key={item} className="flex gap-2 text-sm leading-relaxed text-text-muted"><CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent" /><span>{item}</span></li>)}</ul>
          <p className="mt-5 text-xs font-extrabold uppercase tracking-wide text-text-dim">Sample response</p>
          <p className="mt-2 text-sm leading-relaxed text-text-muted">{resource.sampleAnswer}</p>
        </div>
      )}
    </QuestionShell>
  );
}

function ExtendedResponseResource({ resource }) {
  const [answer, setAnswer] = useState('');
  const [reviewing, setReviewing] = useState(false);

  return (
    <QuestionShell resource={resource}>
      <h2 className="text-xl font-bold leading-snug text-text-primary">{resource.prompt}</h2>
      <textarea value={answer} onChange={(event) => setAnswer(event.target.value)} disabled={reviewing} rows={10} placeholder="Plan or write your response here…" className="mt-5 w-full resize-y rounded-xl border border-line-soft bg-surface-soft p-4 text-sm leading-relaxed text-text-primary outline-none placeholder:text-text-dim focus:border-accent" />
      {!reviewing ? <button type="button" disabled={!answer.trim()} onClick={() => setReviewing(true)} className="mt-4 rounded-xl bg-accent px-5 py-3 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-40">Review response</button> : <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div>
          <div className="mb-2 text-xs font-extrabold uppercase tracking-wide text-text-dim">Planning frame</div>
          <ol className="grid gap-2">
            {resource.planningFrame.map((item) => (
              <li key={item} className="rounded-md border border-line-soft bg-surface-soft px-3 py-2 text-sm leading-relaxed text-text-muted">
                {item}
              </li>
            ))}
          </ol>
        </div>
        <div>
          <div className="mb-2 text-xs font-extrabold uppercase tracking-wide text-text-dim">Band guide</div>
          <div className="grid gap-2">
            {resource.rubric.map((band) => (
              <p key={band} className="rounded-md border border-line-soft bg-surface-soft px-3 py-2 text-sm leading-relaxed text-text-muted">
                {band}
              </p>
            ))}
          </div>
        </div>
        <div className="lg:col-span-2 rounded-lg bg-surface-soft px-4 py-3">
          <p className="text-xs font-extrabold uppercase tracking-wide text-text-dim">Exemplar thesis</p>
        <p className="mt-3 text-sm leading-relaxed text-text-muted">{resource.exemplarThesis}</p>
        </div>
      </div>}
    </QuestionShell>
  );
}

function TopicDrillResource({ resource }) {
  const [selected, setSelected] = useState('');
  const [answer, setAnswer] = useState('');
  const [reviewing, setReviewing] = useState(false);

  return (
    <QuestionShell resource={resource}>
      <h4 className="text-lg font-extrabold leading-snug text-text-primary">{resource.title}</h4>
      <p className="mt-3 rounded-md border border-line-soft bg-surface-soft px-4 py-3 text-sm font-medium leading-relaxed text-text-muted">
        {resource.keyIdea}
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="rounded-md border border-line-soft bg-surface-soft p-4">
          <div className="mb-2 text-xs font-extrabold uppercase tracking-wide text-text-dim">Quick check</div>
          <p className="text-sm font-bold leading-relaxed text-text-primary">{resource.quickCheck.stem}</p>
          <div className="mt-3 grid gap-2">
            {resource.quickCheck.options.map((option, index) => {
              const letter = String.fromCharCode(65 + index);
              return (
                <button key={option} type="button" disabled={reviewing} onClick={() => setSelected(letter)} className={`flex gap-2 rounded-md border px-3 py-2 text-left text-sm leading-relaxed ${selected === letter ? 'border-accent bg-accent-soft text-text-primary' : 'border-line-soft bg-surface-raised text-text-muted'}`}>
                  <span className="font-extrabold">{letter}.</span>
                  <span>{option}</span>
                </button>
              );
            })}
          </div>
          {reviewing ? <div className="mt-3">
            <p className="mt-2 text-sm font-semibold text-accent">Answer: {resource.quickCheck.answer}</p>
            <p className="mt-1 text-sm leading-relaxed text-text-muted">{resource.quickCheck.explanation}</p>
          </div> : null}
        </div>

        <div className="rounded-md border border-line-soft bg-surface-soft p-4">
          <div className="mb-2 text-xs font-extrabold uppercase tracking-wide text-text-dim">Short response</div>
          <p className="text-sm font-bold leading-relaxed text-text-primary">{resource.practicePrompt}</p>
          <textarea value={answer} onChange={(event) => setAnswer(event.target.value)} disabled={reviewing} rows={5} placeholder="Write your response…" className="mt-3 w-full resize-y rounded-lg border border-line-soft bg-surface-raised p-3 text-sm leading-relaxed text-text-primary outline-none focus:border-accent" />
        </div>
      </div>

      {!reviewing ? <button type="button" disabled={!selected || !answer.trim()} onClick={() => setReviewing(true)} className="mt-4 rounded-xl bg-accent px-5 py-3 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-40">Review answers</button> : <div className="mt-4 rounded-lg bg-surface-soft p-4"><ul className="grid gap-2">{resource.markingGuide.map((item) => <li key={item} className="flex gap-2 text-sm leading-relaxed text-text-muted"><CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent" /><span>{item}</span></li>)}</ul><p className="mt-4 text-sm leading-relaxed text-text-muted">{resource.sampleAnswer}</p><p className="mt-3 text-sm font-semibold leading-relaxed text-text-primary">{resource.teacherMove}</p></div>}
    </QuestionShell>
  );
}

function formatStimulusValue(row) {
  const value = typeof row.value === 'number' ? row.value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : row.value;
  return row.unit ? `${value} ${row.unit}` : value;
}

function StimulusSetResource({ resource }) {
  const [answers, setAnswers] = useState(() => resource.questions.map(() => ''));
  const [reviewing, setReviewing] = useState(false);
  const maxValue = Math.max(...resource.data.map((row) => Math.abs(Number(row.value)) || 0), 1);

  return (
    <QuestionShell resource={resource}>
      <div className="mb-3 flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
          <ChartBarIcon className="h-5 w-5" />
        </span>
        <div>
          <h4 className="text-lg font-extrabold leading-snug text-text-primary">{resource.title}</h4>
          <p className="mt-2 text-sm font-medium leading-relaxed text-text-muted">{resource.context}</p>
          <p className="mt-2 text-xs font-bold text-text-dim">{resource.sourceNote}</p>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-md border border-line-soft bg-surface-soft">
        <div className="hidden grid-cols-[minmax(0,0.9fr)_minmax(6rem,0.45fr)_minmax(0,1.15fr)] border-b border-line-soft px-3 py-2 text-xs font-extrabold uppercase tracking-wide text-text-dim md:grid">
          <span>Indicator</span>
          <span>Value</span>
          <span>Use in answer</span>
        </div>
        {resource.data.map((row) => {
          const width = `${Math.max(8, Math.round((Math.abs(Number(row.value)) / maxValue) * 100))}%`;
          return (
            <div
              key={row.indicator}
              className="grid gap-3 border-b border-line-soft px-3 py-3 text-sm last:border-b-0 md:grid-cols-[minmax(0,0.9fr)_minmax(6rem,0.45fr)_minmax(0,1.15fr)]"
            >
              <div className="font-bold leading-snug text-text-primary">{row.indicator}</div>
              <div>
                <div className="font-extrabold text-accent">{formatStimulusValue(row)}</div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-raised">
                  <div className="h-full rounded-full bg-accent" style={{ width }} />
                </div>
              </div>
              <div className="font-medium leading-relaxed text-text-muted">{row.interpretation}</div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid gap-3">
        {resource.questions.map((question, questionIndex) => (
          <div key={question.prompt} className="rounded-md border border-line-soft bg-surface-soft p-4">
            <div className="mb-2 flex items-start justify-between gap-3">
              <p className="text-sm font-extrabold leading-relaxed text-text-primary">{question.prompt}</p>
              <span className="shrink-0 rounded-md bg-surface-raised px-2 py-1 text-xs font-extrabold text-text-muted">
                {question.marks} marks
              </span>
            </div>
            <textarea value={answers[questionIndex]} disabled={reviewing} onChange={(event) => setAnswers((current) => current.map((answer, index) => index === questionIndex ? event.target.value : answer))} rows={4} placeholder="Write your response…" className="mt-2 w-full resize-y rounded-lg border border-line-soft bg-surface-raised p-3 text-sm leading-relaxed text-text-primary outline-none focus:border-accent" />
            {reviewing ? <ul className="mt-4 grid gap-2">{question.markingGuide.map((item) => <li key={item} className="flex gap-2 text-sm leading-relaxed text-text-muted"><CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent" /><span>{item}</span></li>)}</ul> : null}
          </div>
        ))}
      </div>

      {!reviewing ? <button type="button" disabled={answers.some((answer) => !answer.trim())} onClick={() => setReviewing(true)} className="mt-4 rounded-xl bg-accent px-5 py-3 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-40">Review responses</button> : <div className="mt-4 rounded-md bg-surface-soft px-4 py-3">
        <p className="text-xs font-extrabold uppercase tracking-wide text-text-dim">Sample integrated response</p>
        <p className="mt-3 text-sm leading-relaxed text-text-muted">{resource.sampleResponse}</p>
        <p className="mt-3 text-sm font-semibold leading-relaxed text-text-primary">{resource.teacherMove}</p>
      </div>}
    </QuestionShell>
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

function ExamPracticePackCard({ pack }) {
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
    </article>
  );
}

function ExamPracticePacksSection() {
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
          <ExamPracticePackCard key={pack.id} pack={pack} />
        ))}
      </div>
    </section>
  );
}

function ResourceRenderer({ resource }) {
  if (resource.type === 'topicDrill') return <TopicDrillResource resource={resource} />;
  if (resource.type === 'multipleChoice') return <MultipleChoiceResource resource={resource} />;
  if (resource.type === 'shortAnswer') return <ShortAnswerResource resource={resource} />;
  if (resource.type === 'stimulusSet') return <StimulusSetResource resource={resource} />;
  return <ExtendedResponseResource resource={resource} />;
}

const economicsPages = [
  { to: '/library/economics/year-11', icon: BookOpenIcon, eyebrow: 'Year 11', title: 'Foundations', body: 'Build the models, vocabulary and economic thinking that underpin every later topic.' },
  { to: '/library/economics/year-12', icon: AcademicCapIcon, eyebrow: 'Year 12', title: 'HSC course', body: 'Practise economic issues, policy management and Australia in the global economy.' },
  { to: '/library/economics/exam-practice', icon: ClipboardDocumentCheckIcon, eyebrow: 'Timed practice', title: 'Exam packs', body: 'Work through paper-style questions, marking prompts and official anchors.' },
  { to: '/library/economics/assessment', icon: ChartBarIcon, eyebrow: 'Plan smarter', title: 'Assessment guide', body: 'See the HSC paper shape, school weighting and official syllabus links.' },
];

function BackLink({ to, children }) {
  return <Link to={to} className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-text-muted transition-colors hover:text-accent"><span aria-hidden="true">←</span>{children}</Link>;
}

function EconomicsHub() {
  return (
    <main className="min-h-screen bg-surface-body pb-20 pt-24 text-text-primary selection:bg-accent selection:text-white">
      <div className="container-custom">
        <section className="mb-10 max-w-3xl">
          <p className="text-sm font-extrabold uppercase tracking-wide text-accent">Caplet learning library</p>
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight md:text-5xl">Economics</h1>
          <p className="mt-4 max-w-2xl text-base font-medium leading-relaxed text-text-muted md:text-lg">
            Choose your year level, work through a complete exam pack, or check how the course is assessed. Each space stays focused so you can start studying without wading through the whole library.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {economicsPages.map((page) => (
            <Link key={page.to} to={page.to} className="group rounded-xl border border-line-soft bg-surface-raised p-5 transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-[0_18px_40px_-30px_rgba(20,20,18,0.55)]">
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-accent-soft text-accent">
                {createElement(page.icon, { className: 'h-5 w-5' })}
              </span>
              <p className="mt-5 text-xs font-extrabold uppercase tracking-wide text-text-dim">{page.eyebrow}</p>
              <h2 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-text-primary group-hover:text-accent">{page.title}</h2>
              <p className="mt-3 text-sm font-medium leading-relaxed text-text-muted">{page.body}</p>
              <span className="mt-5 inline-flex items-center gap-1 text-sm font-extrabold text-accent">Open <ArrowTopRightOnSquareIcon className="h-4 w-4" /></span>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}

function AssessmentPage() {
  const assessment = economicsResourceLibrary.assessmentBlueprint;
  return (
    <main className="min-h-screen bg-surface-body pb-20 pt-24 text-text-primary selection:bg-accent selection:text-white">
      <div className="container-custom">
        <BackLink to="/library/economics">Economics</BackLink>
        <section className="mb-8 max-w-3xl">
          <p className="text-sm font-extrabold uppercase tracking-wide text-accent">Assessment guide</p>
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight md:text-5xl">Know what the course asks of you.</h1>
          <p className="mt-4 text-base font-medium leading-relaxed text-text-muted">Use this as a planning reference for HSC-style practice and school assessments. Check the official links below for the current rules.</p>
        </section>
        <section className="mb-8 rounded-xl border border-line-soft bg-surface-raised p-5 md:p-7">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-wide text-text-dim">External examination</p><h2 className="mt-1 font-display text-2xl font-extrabold tracking-tight">Paper structure</h2></div><span className="rounded-md bg-accent-soft px-3 py-2 text-sm font-extrabold text-accent">{assessment.externalExam.totalMarks} marks</span></div>
          <p className="mb-4 text-sm font-bold text-text-muted">{assessment.externalExam.time}</p>
          <div className="grid gap-3 md:grid-cols-2">{assessment.externalExam.sections.map((section) => <div key={section.label} className="rounded-lg border border-line-soft bg-surface-soft p-4"><div className="flex justify-between gap-3"><span className="font-extrabold">{section.label}</span><span className="font-extrabold text-accent">{section.marks} marks</span></div><p className="mt-2 text-sm leading-relaxed text-text-muted">{section.format}</p></div>)}</div>
        </section>
        <section className="mb-8 grid gap-3 md:grid-cols-3">{assessment.schoolAssessmentComponents.map((component) => <div key={component.component} className="rounded-lg border border-line-soft bg-surface-raised p-4"><div className="flex justify-between gap-3"><span className="text-sm font-extrabold leading-snug">{component.component}</span><span className="shrink-0 text-sm font-extrabold text-accent">{component.weighting}%</span></div><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-soft"><div className="h-full rounded-full bg-accent" style={{ width: `${component.weighting}%` }} /></div></div>)}</section>
        <OfficialSources />
      </div>
    </main>
  );
}

function OfficialSources() {
  return <section className="rounded-xl border border-line-soft bg-surface-raised p-5"><p className="text-xs font-extrabold uppercase tracking-wide text-text-dim">Official source links</p><div className="mt-4 grid gap-3 md:grid-cols-2">{economicsResourceLibrary.officialSources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="rounded-lg border border-line-soft bg-surface-soft p-4 hover:border-accent"><span className="flex items-start justify-between gap-3"><span className="text-sm font-extrabold leading-snug text-text-primary">{source.title}</span><ArrowTopRightOnSquareIcon className="h-4 w-4 shrink-0 text-accent" /></span><span className="mt-2 block text-xs font-medium leading-relaxed text-text-muted">{source.note}</span></a>)}</div></section>;
}

function YearPage({ year }) {
  const areas = economicsResourceLibrary.focusAreas.filter((area) => area.year === year);
  return (
    <main className="min-h-screen bg-surface-body pb-20 pt-24 text-text-primary">
      <div className="container-custom max-w-6xl">
        <BackLink to="/library/economics">Economics</BackLink>
        <section className="mb-10 max-w-3xl">
          <p className="text-sm font-extrabold uppercase tracking-wide text-accent">Year {year}</p>
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight md:text-5xl">{year === 11 ? 'Build the economic toolkit.' : 'Practise the HSC course.'}</h1>
          <p className="mt-4 text-base font-medium leading-relaxed text-text-muted">Choose a topic. You will work through one activity at a time and review each response before moving on.</p>
        </section>
        <section className="grid gap-4 md:grid-cols-2">
          {areas.map((area) => {
            const resourceCount = getEconomicsAreaResources(area).length;
            return (
              <Link key={area.id} to={`/library/economics/focus/${area.id}`} className="group rounded-xl border border-line-soft bg-surface-raised p-6 transition-colors hover:border-accent">
                <p className="text-xs font-extrabold uppercase tracking-wide text-text-dim">{area.focus}</p>
                <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight group-hover:text-accent">{area.title}</h2>
                <p className="mt-3 text-sm font-medium leading-relaxed text-text-muted">{area.description}</p>
                <p className="mt-5 text-sm font-extrabold text-accent">Start {resourceCount} activities <span aria-hidden="true">→</span></p>
              </Link>
            );
          })}
        </section>
      </div>
    </main>
  );
}

function PracticePlayer({ area }) {
  const [type, setType] = useState('all');
  const [index, setIndex] = useState(0);
  const resources = getEconomicsAreaResources(area).filter((resource) => type === 'all' || resource.type === type);
  const resource = resources[index];

  useEffect(() => setIndex(0), [type, area.id]);

  const move = (nextIndex) => {
    setIndex(nextIndex);
    if (import.meta.env.MODE !== 'test') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <main className="min-h-screen bg-surface-body pb-20 pt-24 text-text-primary">
      <div className="mx-auto max-w-4xl px-6 md:px-10">
        <BackLink to={`/library/economics/year-${area.year}`}>Year {area.year} topics</BackLink>
        <header className="mb-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-extrabold uppercase tracking-wide text-accent">{area.focus}</p>
              <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight md:text-4xl">{area.title}</h1>
            </div>
            <label className="block">
              <span className="sr-only">Activity type</span>
              <select value={type} onChange={(event) => setType(event.target.value)} className="rounded-lg border border-line-soft bg-surface-raised px-3 py-2 text-sm font-bold text-text-primary outline-none focus:border-accent">
                {Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          </div>
          <div className="mt-6 flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-soft"><div className="h-full rounded-full bg-accent transition-all" style={{ width: `${((index + 1) / resources.length) * 100}%` }} /></div>
            <span className="text-xs font-extrabold text-text-dim">{index + 1} / {resources.length}</span>
          </div>
        </header>

        {resource ? <ResourceRenderer key={resource.id} resource={resource} /> : <p className="rounded-xl bg-surface-raised p-8 text-center text-text-muted">No activities in this category.</p>}

        <div className="mt-6 flex items-center justify-between gap-4">
          <button type="button" disabled={index === 0} onClick={() => move(index - 1)} className="rounded-xl border border-line-soft bg-surface-raised px-5 py-3 text-sm font-extrabold text-text-primary disabled:opacity-30">Previous</button>
          <button type="button" disabled={index >= resources.length - 1} onClick={() => move(index + 1)} className="rounded-xl bg-accent px-5 py-3 text-sm font-extrabold text-white disabled:opacity-30">Next activity</button>
        </div>
      </div>
    </main>
  );
}

function ExamPracticePage() {
  return <main className="min-h-screen bg-surface-body pb-20 pt-24 text-text-primary"><div className="container-custom"><BackLink to="/library/economics">Economics</BackLink><section className="mb-8 max-w-3xl"><p className="text-sm font-extrabold uppercase tracking-wide text-accent">Timed practice</p><h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight md:text-5xl">Exam practice</h1><p className="mt-4 text-base font-medium leading-relaxed text-text-muted">Choose a pack when you are ready to work under paper-style conditions.</p></section><ExamPracticePacksSection /></div></main>;
}

export default function ResourceLibrary() {
  const { section, focusId } = useParams();
  const area = economicsResourceLibrary.focusAreas.find((item) => item.id === focusId);

  if (!section) return <EconomicsHub />;
  if (section === 'year-11') return <YearPage year={11} />;
  if (section === 'year-12') return <YearPage year={12} />;
  if (section === 'exam-practice') return <ExamPracticePage />;
  if (section === 'assessment') return <AssessmentPage />;
  if (section === 'focus' && area) return <PracticePlayer area={area} />;
  return <EconomicsHub />;
}
