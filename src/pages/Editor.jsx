import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { normalizeSlide, warnSlide, SLIDE_DEFAULTS, slideKindLabel, SLIDE_PALETTE } from '../lib/slideSchema';
import SlideForm from '../components/editor/SlideForms';
import LessonPreviewModal from '../components/editor/LessonPreviewModal';
import AIChatPanel from '../components/editor/AIChatPanel';
import useDialogFocus from '../lib/useDialogFocus';

let _lid = 0;
const localId = () => `s_${Date.now()}_${++_lid}`;

function decorate(slide) {
  const norm = normalizeSlide(slide) || { type: 'text', content: '' };
  return { _id: localId(), ...norm };
}
function strip(slides) {
  return slides.map(({ _id, ...rest }) => rest); // eslint-disable-line no-unused-vars
}

function lessonPayload(draft) {
  return {
    title: draft.title,
    slides: strip(draft.slides || []),
    syllabusVersion: draft.syllabusVersion || null,
    difficulty: draft.difficulty || null,
    estimatedMinutes: Number(draft.estimatedMinutes || 5),
    assessmentPurpose: draft.assessmentPurpose || null,
    sourceInfo: draft.sourceInfo || {},
    outcomeIds: draft.outcomeIds || [],
    metadata: draft.metadata || {},
  };
}

function lessonSignature(draft) {
  return draft ? JSON.stringify(lessonPayload(draft)) : '';
}

function slideSummary(slide) {
  const n = normalizeSlide(slide);
  if (!n) return '';
  switch (n.type) {
    case 'text': return (n.content || '').slice(0, 80) || '(empty)';
    case 'media': return n.url ? `${n.source}: ${n.url}` : `(no ${n.source} url)`;
    case 'choice': return n.question || '(no question)';
    case 'fillblank': return n.template || '(no template)';
    case 'cards': return `${n.cards.length} card${n.cards.length === 1 ? '' : 's'} · ${n.mode}`;
    case 'match': return `${n.pairs.length} pairs`;
    case 'order': return n.prompt || `${n.items.length} items`;
    case 'table': return `${n.rows.length} × ${n.rows[0]?.length || 0} table`;
    case 'divider': return n.title || '(no title)';
    case 'chart': return `${n.chartType || 'bar'} chart${n.title ? ` · ${n.title}` : ''}`;
    case 'diagram': return (n.code || '').split('\n')[0]?.slice(0, 60) || 'Diagram';
    case 'embed': return n.title || n.url?.replace(/^https?:\/\//, '').slice(0, 60) || '(no url)';
    case 'hotspot': return n.question || '(no question)';
    case 'timeline': return n.prompt || `${(n.events || []).length} events`;
    case 'desmos': return n.title || (n.expressions || []).map((e) => e.latex).join(', ').slice(0, 60) || 'Desmos graph';
    default: return n.type;
  }
}

/* ── Inline rename ─────────────────────────────────────────────────────────── */

function InlineRename({ value, onSave, className = '' }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const commit = async () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) await onSave(trimmed);
    else setDraft(value);
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') { setDraft(value); setEditing(false); }
        }}
        className={`bg-transparent border-b border-accent focus:outline-none ${className}`}
      />
    );
  }
  return (
    <span
      role="button"
      tabIndex={0}
      title="Click to rename"
      onClick={() => { setDraft(value); setEditing(true); }}
      onKeyDown={(e) => e.key === 'Enter' && setEditing(true)}
      className={`cursor-text hover:text-accent transition-colors duration-150 ${className}`}
    >
      {value}
    </span>
  );
}

/* ── Workspace overview (Mode 1) ───────────────────────────────────────────── */

function WorkspaceOverview({
  courses, loading, onEdit, onAddCourse, onAddModule, onAddLesson,
  onRenameCourse, onRenameModule, onTogglePublish, onDeleteCourse, onDeleteModule,
}) {
  const totalModules = courses.reduce((acc, c) => acc + (c.modules || []).length, 0);
  const totalLessons = courses.flatMap((c) => (c.modules || []).flatMap((m) => m.lessons || [])).length;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-surface-body">

      {/* Page header */}
      <div data-tour-id="editor-workspace" className="relative border-b border-line-soft overflow-hidden">
        <div className="absolute top-[-20%] left-[8%] w-[26vw] h-[26vw] max-w-[340px] max-h-[340px] rounded-full bg-[color:var(--block-blue)] blur-[110px] pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-surface-body to-transparent pointer-events-none" />
        <div className="relative max-w-3xl mx-auto px-6 md:px-10 pt-14 pb-12">
          <p className="font-hand text-xl text-blue -rotate-2 mb-3 inline-block">
            lesson workspace
          </p>
          <div className="flex items-end justify-between gap-8">
            <div className="min-w-0">
              <h1 className="text-[2.75rem] font-display font-extrabold text-text-primary tracking-tight leading-none mb-3">
                Your courses
              </h1>
              <p className="text-[15px] text-text-dim leading-relaxed">
                Build, organise, and publish lessons for your students.
              </p>
            </div>
            {courses.length > 0 && (
              <button
                type="button"
                onClick={onAddCourse}
                className="btn-primary shrink-0 px-4 py-2 text-sm font-medium"
              >
                + Course
              </button>
            )}
          </div>

          {/* Inline stats */}
          {!loading && courses.length > 0 && (
            <div className="flex items-center gap-8 mt-8 pt-6 border-t border-line-soft/50">
              {[
                { label: 'courses', value: courses.length },
                { label: 'modules', value: totalModules },
                { label: 'lessons', value: totalLessons },
              ].map((stat) => (
                <div key={stat.label} className="flex items-baseline gap-1.5">
                  <span className="text-xl font-display font-bold text-text-primary tabular-nums">{stat.value}</span>
                  <span className="text-[11px] text-text-dim tracking-wide">{stat.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content area */}
      <div className="max-w-3xl mx-auto px-6 md:px-10 py-10">

        {/* Empty state */}
        {courses.length === 0 && !loading && (
          <div className="text-center py-24">
            <p className="font-mono text-[10px] font-medium text-text-dim/40 uppercase tracking-[0.22em] mb-8 select-none">empty workspace</p>
            <p className="text-[1.75rem] font-display font-bold text-text-primary tracking-tight leading-none mb-3">No courses yet</p>
            <p className="text-[14px] font-serif italic text-text-dim mb-10 leading-relaxed">
              Your workspace is empty. Add a course to start building.
            </p>
            <button
              type="button"
              onClick={onAddCourse}
              className="btn-primary px-6 py-2.5 text-sm"
            >
              + Create your first course
            </button>
          </div>
        )}

        {/* Course cards */}
        <div className="space-y-5">
          {courses.map((c, ci) => {
            const totalLessons = (c.modules || []).flatMap((m) => m.lessons || []).length;
            const stagger = ci === 0 ? '' : ci === 1 ? 'stagger-1' : ci === 2 ? 'stagger-2' : 'stagger-3';
            return (
              <div
                key={c.id}
                className={`opacity-0 animate-fade-slide-up ${stagger} rounded-xl border border-line-soft bg-surface-raised overflow-hidden transition-colors duration-200 hover:border-text-dim/30`}
              >
                {/* Card body */}
                <div className="flex-1 min-w-0">

                  {/* Course header */}
                  <div className="flex items-start gap-3 px-6 py-4 border-b border-line-soft">
                    <div className="flex-1 min-w-0">
                      <InlineRename
                        value={c.title}
                        onSave={(title) => onRenameCourse(c.id, title)}
                        className="text-2xl font-display font-bold text-text-primary leading-tight"
                      />
                      <p className="font-mono text-xs text-text-dim mt-1.5">
                        {(c.modules || []).length} module{(c.modules || []).length !== 1 ? 's' : ''}
                        {' · '}
                        {totalLessons} lesson{totalLessons !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 mt-0.5">
                      <button
                        type="button"
                        onClick={() => onTogglePublish(c.id, c.isPublished)}
                        title={c.isPublished ? 'Published — click to unpublish' : 'Draft — click to publish'}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors duration-150 ${
                          c.isPublished
                            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600'
                            : 'border-line-soft text-text-dim hover:border-text-dim'
                        }`}
                      >
                        {c.isPublished ? 'Live' : 'Draft'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onAddModule(c.id)}
                        className="text-sm font-medium text-accent hover:underline transition-colors duration-150"
                      >
                        + Module
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteCourse(c.id, c.title)}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-text-dim hover:text-rose-500 hover:bg-rose-500/10 hover:border-rose-400/40 border border-transparent transition-colors duration-150"
                        title="Delete course"
                      >
                        <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1.5 1.5L7.5 7.5M7.5 1.5L1.5 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                      </button>
                    </div>
                  </div>

                  {/* Modules */}
                  {(c.modules || []).length === 0 ? (
                    <div className="px-6 py-5 font-serif italic text-sm text-text-dim">
                      No modules yet.{' '}
                      <button
                        type="button"
                        onClick={() => onAddModule(c.id)}
                        className="not-italic text-accent hover:underline transition-colors duration-150"
                      >
                        + Add a module
                      </button>
                    </div>
                  ) : (
                    (c.modules || []).map((m, mi) => (
                      <div key={m.id} className={mi > 0 ? 'border-t border-line-soft/50' : ''}>

                        {/* Module row */}
                        <div className="flex items-center gap-3 px-6 py-2.5">
                          <InlineRename
                            value={m.title}
                            onSave={(title) => onRenameModule(m.id, title)}
                            className="flex-1 min-w-0 text-sm font-semibold text-text-muted"
                          />
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => onAddLesson(m.id)}
                              className="text-xs font-medium text-accent hover:underline transition-colors duration-150"
                            >
                              + Lesson
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteModule(m.id, m.title)}
                              className="w-6 h-6 rounded-full flex items-center justify-center text-text-dim hover:text-rose-500 hover:bg-rose-500/10 hover:border-rose-400/40 border border-transparent transition-colors duration-150"
                              title="Delete module"
                            >
                              <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 1.5L6.5 6.5M6.5 1.5L1.5 6.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                            </button>
                          </div>
                        </div>

                        {/* Lesson list */}
                        {(m.lessons || []).length > 0 ? (
                          <ul>
                            {(m.lessons || []).map((l, li) => (
                              <li key={l.id} className="border-t border-line-soft/30 first:border-t-0">
                                <button
                                  type="button"
                                  onClick={() => onEdit({ lesson: l, courseId: c.id, moduleId: m.id })}
                                  className="group w-full flex items-center gap-4 px-6 py-4 hover:bg-surface-soft/60 active:bg-surface-soft transition-colors duration-150 text-left"
                                >
                                  <span className="font-mono text-xs text-text-dim w-5 shrink-0 select-none">
                                    {String(li + 1).padStart(2, '0')}
                                  </span>
                                  <span className="flex-1 min-w-0 text-sm font-medium text-text-primary group-hover:text-accent truncate transition-colors duration-150">{l.title}</span>
                                  <span className="shrink-0 text-text-dim group-hover:text-accent transition-all duration-150 group-hover:translate-x-0.5 transform">
                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                  </span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="px-6 py-4 font-serif italic text-sm text-text-dim">
                            No lessons yet.{' '}
                            <button
                              type="button"
                              onClick={() => onAddLesson(m.id)}
                              className="not-italic text-accent hover:underline transition-colors duration-150"
                            >
                              + Add a lesson
                            </button>
                          </p>
                        )}
                      </div>
                    ))
                  )}
              </div>
            </div>
          );
          })}
        </div>

        {courses.length > 0 && (
          <div className="mt-10 pt-6 border-t border-line-soft/40">
            <button
              type="button"
              onClick={onAddCourse}
              className="text-[13px] font-medium text-text-dim/60 hover:text-accent transition-colors duration-150"
            >
              + Add another course
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Single slide card ─────────────────────────────────────────────────────── */

function SlideCard({
  slide, index, total, expanded, onToggle, onMove, onDuplicate, onDelete, onChange, lessonId,
}) {
  const warnings = warnSlide(slide);
  const hasWarning = warnings.length > 0;

  return (
    <div
      data-tour-id={slideKindLabel(slide) === 'Reading' ? 'editor-reading-slide' : undefined}
      className={`group rounded-xl border bg-surface-raised transition-colors duration-150 ${
        expanded
          ? 'border-accent/40'
          : hasWarning
          ? 'border-amber-400/60'
          : 'border-line-soft hover:border-text-dim/25'
      }`}
    >
      <div className="flex items-center gap-3 px-5 py-4">
        <span className="font-mono text-[11px] text-text-dim/60 w-6 shrink-0 select-none tabular-nums">
          {String(index + 1).padStart(2, '0')}
        </span>
        <button
          type="button"
          onClick={onToggle}
          className="flex-1 min-w-0 text-left"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <span className="inline-flex items-center px-2 py-[3px] rounded-md bg-accent/[0.08] text-accent text-[10px] font-bold tracking-wide uppercase">
              {slideKindLabel(slide)}
            </span>
            {hasWarning && !expanded && (
              <span className="inline-flex items-center gap-1 px-2 py-[3px] rounded-md bg-amber-400/10 text-amber-600 text-[10px] font-bold tracking-wide uppercase">
                ⚠ {warnings.length}
              </span>
            )}
          </div>
          <p className="text-[13.5px] text-text-primary truncate leading-snug" title={slideSummary(slide)}>
            {slideSummary(slide)}
          </p>
        </button>
        <div className="flex items-center gap-1 shrink-0">
          {/* Move + duplicate — visible on card hover only */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 translate-y-0.5 group-hover:translate-y-0 transition-all duration-150">
            <button
              type="button"
              onClick={() => onMove(-1)}
              disabled={index === 0}
              className="w-8 h-8 rounded-full border border-line-soft text-text-dim hover:text-text-primary hover:border-text-dim disabled:opacity-30 transition-colors duration-150 flex items-center justify-center"
              aria-label="Move up"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 9V3M3 5.5L6 3l3 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <button
              type="button"
              onClick={() => onMove(1)}
              disabled={index === total - 1}
              className="w-8 h-8 rounded-full border border-line-soft text-text-dim hover:text-text-primary hover:border-text-dim disabled:opacity-30 transition-colors duration-150 flex items-center justify-center"
              aria-label="Move down"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 3v6M9 6.5L6 9 3 6.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <button
              type="button"
              onClick={onDuplicate}
              className="w-8 h-8 rounded-full border border-line-soft text-text-dim hover:text-text-primary hover:border-text-dim transition-colors duration-150 flex items-center justify-center"
              aria-label="Duplicate"
              title="Duplicate"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="4.5" y="1" width="6.5" height="7.5" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><rect x="1" y="3.5" width="6.5" height="7.5" rx="1.5" stroke="currentColor" strokeWidth="1.2" fill="var(--surface-raised)"/></svg>
            </button>
          </div>
          {/* Delete + expand — always visible */}
          <button
            type="button"
            onClick={onDelete}
            className="w-8 h-8 rounded-full border border-line-soft text-text-dim hover:text-rose-500 hover:border-rose-400/60 transition-colors duration-150 flex items-center justify-center"
            aria-label="Delete"
            title="Delete"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onToggle}
            className="ml-1 w-8 h-8 rounded-full border border-line-soft text-text-dim hover:text-text-primary hover:border-text-dim transition-colors duration-150 flex items-center justify-center"
            aria-label={expanded ? 'Collapse' : 'Expand'}
            title={expanded ? 'Collapse' : 'Edit'}
          >
            <svg
              width="12" height="12" viewBox="0 0 12 12" fill="none"
              className={`transition-transform duration-250 ease-out ${expanded ? 'rotate-180' : ''}`}
              style={{ transitionDuration: '220ms' }}
            >
              <path
                d="M3 4.5L6 7.5L9 4.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Animated expand/collapse via CSS grid */}
      <div className={`grid transition-all duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div className="border-t border-line-soft/50 px-5 py-4 space-y-4">
            {hasWarning && (
              <div className="flex items-start gap-3 px-3.5 py-3 rounded-xl border border-amber-400/30 bg-amber-400/[0.04]">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 mt-[1px] text-amber-500">
                  <path d="M7 2L12.5 11.5H1.5L7 2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                  <path d="M7 6v3M7 10.5h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                <div>
                  <ul className="space-y-0.5">
                    {warnings.map((w, i) => (
                      <li key={i} className="text-[11.5px] text-amber-700 dark:text-amber-400 leading-snug">{w}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            <SlideForm slide={slide} onChange={onChange} lessonId={lessonId} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Lesson builder (Mode 2) ───────────────────────────────────────────────── */

/* ── Add-slide palette ─────────────────────────────────────────────────────── */

function AddSlideBar({ onAddSlide }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-6 mb-14">
      {open ? (
        <div className="rounded-xl border border-line-soft bg-surface-raised p-4 animate-slide-card-enter">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold text-text-dim uppercase tracking-[0.07em]">Insert slide</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-5 h-5 flex items-center justify-center rounded-full text-text-dim hover:text-text-primary hover:bg-surface-soft transition-colors duration-100 text-xs"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
            {SLIDE_PALETTE.map((p) => (
              <button
                key={p.type}
                type="button"
                onClick={() => { onAddSlide(p.type); setOpen(false); }}
                className="flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-lg border border-transparent hover:border-line-soft hover:bg-surface-soft text-left transition-all duration-100"
              >
                <span className="text-xs font-semibold text-text-primary leading-tight">{p.label}</span>
                <span className="text-[10px] text-text-dim leading-snug">{p.desc}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm text-text-dim/60 hover:text-accent hover:bg-accent/[0.04] transition-colors duration-150"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1.5v10M1.5 6.5h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          Add slide
        </button>
      )}
    </div>
  );
}

function LessonBuilder({ lessonId, draft, setDraft, saveMsg, onNewSlide, onAddSlide }) {
  const [expandedId, setExpandedId] = useState(null);

  // When a new slide is added externally (via chat or header), auto-expand it
  useEffect(() => {
    if (onNewSlide) setExpandedId(onNewSlide);
  }, [onNewSlide]);

  const updateSlide = (id, value) => {
    setDraft((d) => ({
      ...d,
      slides: d.slides.map((s) => (s._id === id ? { ...value, _id: id } : s)),
    }));
  };
  const deleteSlide = (id) => {
    setDraft((d) => ({ ...d, slides: d.slides.filter((s) => s._id !== id) }));
    if (expandedId === id) setExpandedId(null);
  };
  const duplicateSlide = (id) => {
    setDraft((d) => {
      const idx = d.slides.findIndex((s) => s._id === id);
      if (idx < 0) return d;
      const copy = { ...d.slides[idx], _id: localId() };
      const slides = [...d.slides];
      slides.splice(idx + 1, 0, copy);
      return { ...d, slides };
    });
  };
  const moveSlide = (id, dir) => {
    setDraft((d) => {
      const idx = d.slides.findIndex((s) => s._id === id);
      const j = idx + dir;
      if (idx < 0 || j < 0 || j >= d.slides.length) return d;
      const slides = [...d.slides];
      [slides[idx], slides[j]] = [slides[j], slides[idx]];
      return { ...d, slides };
    });
  };

  if (!draft) return null;

  const slidePanel = (
    <div>
      <div className="max-w-3xl mx-auto px-6 md:px-10 pt-10 pb-8 md:pt-12">

        {/* Lesson title */}
        <input
          value={draft.title}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          className="w-full bg-transparent text-[2.5rem] md:text-5xl font-display font-bold text-text-primary tracking-tight focus:outline-none leading-none pb-3 border-b border-transparent focus:border-line-soft/50 transition-colors duration-200"
          placeholder="Untitled lesson"
        />

        {/* Slide count */}
        {draft.slides.length > 0 && (
          <p className="font-mono text-[11px] text-text-dim/50 mt-3 tracking-wide">
            {draft.slides.length} slide{draft.slides.length !== 1 ? 's' : ''}
          </p>
        )}

        {/* Divider */}
        <div className="mt-8 mb-8 h-px bg-line-soft/50" />

        {saveMsg && (
          <div className={`mb-6 flex items-start gap-2.5 px-4 py-3 rounded-xl border text-sm animate-slide-card-enter ${
            saveMsg.tone === 'error' ? 'bg-rose-500/[0.05] border-rose-400/30 text-rose-600 dark:text-rose-400'
            : saveMsg.tone === 'warn' ? 'bg-amber-400/[0.06] border-amber-400/30 text-amber-700 dark:text-amber-400'
            : 'bg-emerald-500/[0.05] border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
          }`}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 mt-[1px]">
              {saveMsg.tone === 'ok' ? (
                <path d="M2.5 7l3 3 6-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              ) : (
                <><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3"/><path d="M7 4.5v3M7 9.5h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></>
              )}
            </svg>
            {saveMsg.text}
          </div>
        )}

        {/* Slide list */}
        <div className="space-y-3">
          {draft.slides.length === 0 && (
            <div className="flex flex-col items-center py-14">
              <div className="rounded-xl bg-surface-raised border border-line-soft px-8 py-6 text-center inline-flex flex-col items-center">
                <p className="font-mono text-[10px] font-medium text-text-dim/50 uppercase tracking-[0.2em] mb-2.5 select-none">no slides yet</p>
                <p className="text-[13px] text-text-dim leading-relaxed">Use the button below to add your first slide.</p>
              </div>
            </div>
          )}
          {draft.slides.map((s, i) => (
            <SlideCard
              key={s._id}
              slide={s}
              index={i}
              total={draft.slides.length}
              expanded={expandedId === s._id}
              onToggle={() => setExpandedId((cur) => (cur === s._id ? null : s._id))}
              onMove={(dir) => moveSlide(s._id, dir)}
              onDuplicate={() => duplicateSlide(s._id)}
              onDelete={() => deleteSlide(s._id)}
              onChange={(value) => updateSlide(s._id, value)}
              lessonId={lessonId}
            />
          ))}
          {onAddSlide && <AddSlideBar onAddSlide={onAddSlide} />}
        </div>
      </div>
    </div>
  );

  return <div className="flex-1 min-h-0 overflow-y-auto bg-surface-body lesson-grid-bg">{slidePanel}</div>;
}

const LIFECYCLE_LABELS = {
  draft: 'Draft',
  in_review: 'In review',
  approved: 'Approved',
  published: 'Published',
  superseded: 'Superseded',
};

const NEXT_LIFECYCLE = {
  draft: ['in_review'],
  in_review: ['draft', 'approved'],
  approved: ['draft', 'published'],
  published: ['superseded'],
  superseded: [],
};

function ContentQualityDrawer({ draft, setDraft, outcomes, validation, history, busy, onValidate, onTransition, onCreateVersion, onClose }) {
  const dialogRef = useDialogFocus({ onDismiss: onClose, dismissDisabled: busy });
  const sourceInfo = draft.sourceInfo || {};
  const selected = new Set((draft.outcomeIds || []).map(String));
  const assessableOutcomes = outcomes.filter((outcome) => outcome.metadata?.level !== 'year');
  const status = draft.lifecycleStatus || 'draft';
  const humanReviewConfirmed = draft.metadata?.humanReviewConfirmed === true;
  const updateReview = (patch) => setDraft((current) => ({
    ...current,
    metadata: { ...(current.metadata || {}), ...patch },
  }));
  const updateSource = (patch) => setDraft((current) => ({
    ...current,
    sourceInfo: { ...(current.sourceInfo || {}), ...patch },
  }));
  const toggleOutcome = (id) => setDraft((current) => {
    const ids = new Set((current.outcomeIds || []).map(String));
    if (ids.has(String(id))) ids.delete(String(id));
    else ids.add(String(id));
    return { ...current, outcomeIds: [...ids] };
  });

  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-text-primary/30" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <section ref={dialogRef} tabIndex="-1" role="dialog" aria-modal="true" aria-labelledby="quality-title" className="relative h-full w-full max-w-xl overflow-y-auto bg-surface-body p-6 shadow-2xl md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Content governance</p>
            <h2 id="quality-title" className="mt-2 text-3xl font-display font-extrabold tracking-tight">Quality and publishing</h2>
          </div>
          <button type="button" data-initial-focus onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full border border-line-soft text-xl text-text-muted" aria-label="Close">×</button>
        </div>

        <section className="mt-8 rounded-3xl bg-surface-raised p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-text-dim">Lifecycle</p>
              <p className="mt-1 text-xl font-display font-extrabold text-text-primary">{LIFECYCLE_LABELS[status] || status}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {status === 'published' && (
                <button type="button" disabled={busy} onClick={onCreateVersion} className="btn-primary px-4 py-2 text-xs disabled:opacity-50">
                  Create new draft version
                </button>
              )}
              {(NEXT_LIFECYCLE[status] || []).map((next) => (
                <button key={next} type="button" disabled={busy} onClick={() => onTransition(next)} className="btn-secondary px-4 py-2 text-xs disabled:opacity-50">
                  Move to {LIFECYCLE_LABELS[next]}
                </button>
              ))}
            </div>
          </div>
          {status === 'in_review' && (
            <div className="mt-5 rounded-2xl bg-surface-soft p-4">
              <p className="text-xs font-medium leading-relaxed text-text-muted">Approval is attributed to the signed-in admin or verified teacher account.</p>
              <label className="mt-4 flex items-start gap-3 text-sm font-medium text-text-muted">
                <input type="checkbox" checked={humanReviewConfirmed} onChange={(event) => updateReview({ humanReviewConfirmed: event.target.checked })} className="mt-1 accent-[var(--accent)]" />
                I checked curriculum accuracy, sources, answer feedback, and accessibility.
              </label>
            </div>
          )}
        </section>

        <fieldset disabled={['published', 'superseded'].includes(status)} className="mt-6 grid gap-5 rounded-3xl bg-surface-raised p-6 sm:grid-cols-2 disabled:opacity-70">
          <label className="text-sm font-bold text-text-muted">Syllabus version
            <input value={draft.syllabusVersion || ''} onChange={(event) => setDraft((current) => ({ ...current, syllabusVersion: event.target.value }))} placeholder="NSW-2025" className="mt-2 w-full rounded-xl border border-line-soft bg-surface-soft px-3 py-2.5 text-text-primary outline-none focus:border-accent" />
          </label>
          <label className="text-sm font-bold text-text-muted">Difficulty
            <select value={draft.difficulty || ''} onChange={(event) => setDraft((current) => ({ ...current, difficulty: event.target.value }))} className="mt-2 w-full rounded-xl border border-line-soft bg-surface-soft px-3 py-2.5 text-text-primary outline-none focus:border-accent">
              <option value="">Choose</option><option value="foundation">Foundation</option><option value="core">Core</option><option value="extension">Extension</option><option value="exam">Exam</option>
            </select>
          </label>
          <label className="text-sm font-bold text-text-muted">Estimated minutes
            <input type="number" min="1" max="300" value={draft.estimatedMinutes || 5} onChange={(event) => setDraft((current) => ({ ...current, estimatedMinutes: Number(event.target.value) }))} className="mt-2 w-full rounded-xl border border-line-soft bg-surface-soft px-3 py-2.5 text-text-primary outline-none focus:border-accent" />
          </label>
          <label className="text-sm font-bold text-text-muted">Assessment purpose
            <select value={draft.assessmentPurpose || ''} onChange={(event) => setDraft((current) => ({ ...current, assessmentPurpose: event.target.value }))} className="mt-2 w-full rounded-xl border border-line-soft bg-surface-soft px-3 py-2.5 text-text-primary outline-none focus:border-accent">
              <option value="">Choose</option><option value="instruction">Instruction</option><option value="diagnostic">Diagnostic</option><option value="formative">Formative</option><option value="summative">Summative</option><option value="revision">Revision</option>
            </select>
          </label>
          <label className="text-sm font-bold text-text-muted sm:col-span-2">Source URL
            <input type="url" value={sourceInfo.sourceUrl || ''} onChange={(event) => updateSource({ sourceUrl: event.target.value })} className="mt-2 w-full rounded-xl border border-line-soft bg-surface-soft px-3 py-2.5 text-text-primary outline-none focus:border-accent" />
          </label>
          <label className="text-sm font-bold text-text-muted sm:col-span-2">Citation or attribution
            <textarea value={sourceInfo.citation || ''} onChange={(event) => updateSource({ citation: event.target.value })} rows="2" className="mt-2 w-full rounded-xl border border-line-soft bg-surface-soft px-3 py-2.5 text-text-primary outline-none focus:border-accent" />
          </label>
          <label className="text-sm font-bold text-text-muted">Source reviewed
            <input type="date" value={String(sourceInfo.reviewedAt || '').slice(0, 10)} onChange={(event) => updateSource({ reviewedAt: event.target.value })} className="mt-2 w-full rounded-xl border border-line-soft bg-surface-soft px-3 py-2.5 text-text-primary outline-none focus:border-accent" />
          </label>
        </fieldset>

        <fieldset disabled={['published', 'superseded'].includes(status)} className="mt-6 rounded-3xl bg-surface-raised p-6 disabled:opacity-70">
          <legend className="px-1 text-sm font-display font-extrabold text-text-primary">Curriculum outcomes</legend>
          <p className="mt-1 text-xs font-medium text-text-muted">Map at least one assessable outcome before review.</p>
          <div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-2">
            {assessableOutcomes.map((outcome) => (
              <label key={outcome.id} className="flex cursor-pointer items-start gap-3 rounded-xl bg-surface-soft p-3">
                <input type="checkbox" checked={selected.has(String(outcome.id))} onChange={() => toggleOutcome(outcome.id)} className="mt-1 accent-[var(--accent)]" />
                <span><span className="font-mono text-xs font-bold text-accent">{outcome.code}</span><span className="mt-0.5 block text-sm font-semibold text-text-primary">{outcome.title}</span></span>
              </label>
            ))}
          </div>
        </fieldset>

        <section className="mt-6 rounded-3xl bg-surface-raised p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-display font-extrabold">Publishing checks</h3>
            <button type="button" onClick={onValidate} disabled={busy} className="btn-primary px-4 py-2 text-xs disabled:opacity-50">{busy ? 'Checking…' : 'Run checks'}</button>
          </div>
          {validation ? (
            <div className="mt-4 space-y-3" aria-live="polite">
              <p className={`text-sm font-bold ${validation.ok ? 'text-[color:var(--mark-green)]' : 'text-text-error'}`}>{validation.ok ? 'Ready for review.' : `${validation.errors.length} blocking issue${validation.errors.length === 1 ? '' : 's'}.`}</p>
              {[...(validation.errors || []), ...(validation.warnings || [])].map((item, index) => <p key={`${item.code}-${index}`} className="rounded-xl bg-surface-soft px-3 py-2 text-xs font-medium text-text-muted">{item.message}</p>)}
            </div>
          ) : <p className="mt-3 text-sm font-medium text-text-muted">Run checks for outcome mapping, slide validity, duplicated questions, accessible media, source freshness, and AI review.</p>}
        </section>

        <section className="mt-6 rounded-3xl bg-surface-raised p-6">
          <h3 className="text-lg font-display font-extrabold">Version history</h3>
          <div className="mt-4 space-y-2">
            {history.length ? history.slice(0, 10).map((revision) => <div key={revision.id} className="rounded-xl bg-surface-soft p-3"><p className="text-sm font-bold">Version {revision.version}</p><p className="mt-1 text-xs font-medium text-text-muted">{revision.changeSummary || 'Lesson updated'} · {new Date(revision.createdAt).toLocaleString('en-AU')}</p></div>) : <p className="text-sm font-medium text-text-muted">No saved revisions yet.</p>}
          </div>
        </section>
      </section>
    </div>
  );
}

/* ── Code-gated workspace ─────────────────────────────────────────────────── */

function EditorAccessGate({ onEntered }) {
  const [code, setCode] = useState('');
  const [entering, setEntering] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    if (!code.trim()) return;
    setEntering(true);
    setError('');
    try {
      await api.editorEnter(code.trim());
      onEntered();
    } catch (caught) {
      setError(caught.message || 'That workspace code was not recognised.');
    } finally {
      setEntering(false);
    }
  };

  return (
    <main className="min-h-screen bg-surface-body px-6 py-28 selection:bg-accent selection:text-white">
      <div className="mx-auto max-w-lg rounded-3xl bg-surface-raised p-8 shadow-[0_30px_70px_-42px_rgba(20,20,18,0.5)] md:p-10">
        <p className="font-hand text-xl text-accent -rotate-2 inline-block">author workspace</p>
        <h1 className="mt-3 text-4xl font-display font-extrabold tracking-tight text-text-primary">Enter the lesson editor.</h1>
        <p className="mt-4 text-sm font-medium leading-relaxed text-text-muted">Use the private code provided for your curriculum workspace. Sessions stay on this device and expire automatically.</p>
        <form onSubmit={submit} className="mt-8">
          <label htmlFor="editor-code" className="text-sm font-bold text-text-primary">Workspace code</label>
          <input
            id="editor-code"
            type="password"
            autoComplete="one-time-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-line-soft bg-surface-soft px-4 py-3 font-mono text-text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
          {error && <p role="alert" className="mt-4 rounded-2xl bg-surface-error px-4 py-3 text-sm font-bold text-text-error">{error}</p>}
          <button type="submit" disabled={entering || !code.trim()} className="btn-primary mt-6 w-full justify-center disabled:opacity-50">
            {entering ? 'Checking…' : 'Open workspace'}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function Editor({ demoAccess = false, initialLessonId = '' }) {
  const [authorised, setAuthorised] = useState(() => (
    demoAccess || (typeof sessionStorage !== 'undefined' && Boolean(sessionStorage.getItem('editorToken')))
  ));
  const revokeAccess = useCallback(() => {
    if (demoAccess) return;
    api.clearEditorToken();
    setAuthorised(false);
  }, [demoAccess]);

  if (!authorised) return <EditorAccessGate onEntered={() => setAuthorised(true)} />;
  return <EditorWorkspace onUnauthorized={revokeAccess} initialLessonId={initialLessonId} demoAccess={demoAccess} />;
}

function EditorWorkspace({ onUnauthorized, initialLessonId = '', demoAccess = false }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [selected, setSelected] = useState(null);
  const [draft, setDraft] = useState(null);
  const [originalSig, setOriginalSig] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [lastAddedId, setLastAddedId] = useState(null);
  const [showAI, setShowAI] = useState(false);
  const [aiMessages, setAiMessages] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [panelWidth, setPanelWidth] = useState(420);
  const [showQuality, setShowQuality] = useState(false);
  const [curriculumOutcomes, setCurriculumOutcomes] = useState([]);
  const [qualityValidation, setQualityValidation] = useState(null);
  const [lessonHistory, setLessonHistory] = useState([]);
  const [qualityBusy, setQualityBusy] = useState(false);
  const initialSelectionDone = useRef(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setGlobalError('');
    try {
      const data = await api.editorTree();
      setCourses(data.courses || []);
      return data.courses || [];
    } catch (e) {
      if (e.status === 401) onUnauthorized();
      setGlobalError(e.message || 'Failed to load workspace');
      return [];
    } finally {
      setLoading(false);
    }
  }, [onUnauthorized]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    let active = true;
    api.editorCurriculumOutcomes('economics')
      .then((data) => { if (active) setCurriculumOutcomes(data?.outcomes || []); })
      .catch((error) => { if (error.status === 401) onUnauthorized(); });
    return () => { active = false; };
  }, [onUnauthorized]);

  const currentSig = useMemo(() => {
    if (!draft) return '';
    return lessonSignature(draft);
  }, [draft]);
  const dirty = !!draft && currentSig !== originalSig;
  const contentLocked = ['published', 'superseded'].includes(draft?.lifecycleStatus);

  /* Derived breadcrumb values for Mode 2 header */
  const selectedCourse = courses.find((c) => c.id === selected?.courseId);
  const selectedModule = selectedCourse?.modules?.find((m) => m.id === selected?.moduleId);

  const openLesson = useCallback((selection) => {
    setSelected(selection);
    setSaveMsg(null);
    setPreviewOpen(false);
    setLastAddedId(null);
    setAiMessages([]);
    setShowAI(false);
    setShowQuality(false);
    setQualityValidation(null);
    setLessonHistory([]);
    const slides = Array.isArray(selection.lesson.slides) ? selection.lesson.slides : [];
    const decorated = slides.map(decorate);
    const next = {
      title: selection.lesson.title || '',
      slides: decorated,
      syllabusVersion: selection.lesson.syllabusVersion || '',
      difficulty: selection.lesson.difficulty || '',
      estimatedMinutes: selection.lesson.estimatedMinutes || selection.lesson.duration || 5,
      assessmentPurpose: selection.lesson.assessmentPurpose || '',
      sourceInfo: selection.lesson.sourceInfo || {},
      outcomeIds: selection.lesson.outcomeIds || selection.lesson.metadata?.outcomeIds || [],
      metadata: selection.lesson.metadata || {},
      lifecycleStatus: selection.lesson.lifecycleStatus || (selection.lesson.isPublished ? 'published' : 'draft'),
      contentVersion: selection.lesson.contentVersion || 1,
    };
    setDraft(next);
    setOriginalSig(lessonSignature(next));
  }, []);

  useEffect(() => {
    if (initialSelectionDone.current || !initialLessonId || !courses.length) return;
    for (const course of courses) {
      for (const module of course.modules || []) {
        const lesson = (module.lessons || []).find((item) => String(item.id) === String(initialLessonId));
        if (!lesson) continue;
        initialSelectionDone.current = true;
        openLesson({ lesson, courseId: course.id, moduleId: module.id });
        return;
      }
    }
  }, [courses, initialLessonId, openLesson]);

  const addSlideFromType = useCallback((paletteType) => {
    let next;
    if (paletteType === 'choice-tf') {
      next = { ...SLIDE_DEFAULTS.choice(), mode: 'truefalse', options: ['True', 'False'], correctIndices: [0] };
    } else {
      next = SLIDE_DEFAULTS[paletteType]?.() || null;
    }
    if (!next) return;
    next._id = localId();
    setDraft((d) => ({ ...d, slides: [...d.slides, next] }));
    setLastAddedId(next._id);
  }, []);

  const startResize = useCallback((e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = panelWidth;
    const onMove = (ev) => {
      const delta = startX - ev.clientX;
      setPanelWidth(Math.min(Math.max(startW + delta, 240), 600));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [panelWidth]);

  const handleAISubmit = useCallback(async (text, model, formatterModel, attachedText, slideCount, attachmentMeta) => {
    setAiMessages((m) => [...m, { id: Date.now(), role: 'user', text, attachment: attachmentMeta }]);
    setAiLoading(true);
    try {
      const res = await api.aiLessonChat({
        message: text,
        lessonTitle: draft?.title || '',
        existingSlideCount: draft?.slides?.length || 0,
        model,
        formatterModel,
        notes: attachedText || undefined,
        slideCount: slideCount || undefined,
      });
      if (res.action === 'generate' && res.slides?.length) {
        const newSlides = res.slides.map(decorate);
        setDraft((d) => ({
          ...d,
          slides: [...d.slides, ...newSlides],
          metadata: { ...(d.metadata || {}), generatedByAI: true },
        }));
        setLastAddedId(newSlides[newSlides.length - 1]?._id);
        setAiMessages((m) => [...m, {
          id: Date.now() + 1,
          role: 'ai',
          text: `Added ${res.slides.length} slide${res.slides.length !== 1 ? 's' : ''} to your lesson.`,
          slideCount: res.slides.length,
        }]);
      } else {
        setAiMessages((m) => [...m, { id: Date.now() + 1, role: 'ai', text: res.text || 'Done.' }]);
      }
    } catch (e) {
      setAiMessages((m) => [...m, { id: Date.now() + 1, role: 'ai', text: e.message || 'Something went wrong.', isError: true }]);
    } finally {
      setAiLoading(false);
    }
  }, [draft]);

  const handleAIAddSlide = useCallback((cmd) => {
    addSlideFromType(cmd.paletteType);
  }, [addSlideFromType]);

  const handleBack = () => {
    if (dirty && !window.confirm('You have unsaved changes. Go back to the workspace without saving?')) return;
    setSelected(null);
    setDraft(null);
    setOriginalSig('');
    setSaveMsg(null);
  };

  const addCourse = async () => {
    try {
      await api.editorCreateCourse({ title: 'New course' });
      await reload();
    } catch (e) {
      setGlobalError(e.message || 'Failed to create course');
    }
  };

  const addModule = async (courseId) => {
    try {
      await api.editorCreateModule({ courseId, title: 'New module' });
      await reload();
    } catch (e) {
      setGlobalError(e.message || 'Failed to create module');
    }
  };

  const togglePublish = async (courseId, currentlyPublished) => {
    try {
      await api.editorUpdateCourse(courseId, { isPublished: !currentlyPublished });
      await reload();
    } catch (e) {
      setGlobalError(e.message || 'Failed to update publish state');
    }
  };

  const deleteCourse = async (courseId, title) => {
    if (!window.confirm(`Delete course "${title}" and all its modules and lessons? This cannot be undone.`)) return;
    try {
      await api.editorDeleteCourse(courseId);
      if (selected?.courseId === courseId) { setSelected(null); setDraft(null); setOriginalSig(''); }
      await reload();
    } catch (e) {
      setGlobalError(e.message || 'Failed to delete course');
    }
  };

  const deleteModule = async (moduleId, title) => {
    if (!window.confirm(`Delete module "${title}" and all its lessons? This cannot be undone.`)) return;
    try {
      await api.editorDeleteModule(moduleId);
      if (selected?.moduleId === moduleId) { setSelected(null); setDraft(null); setOriginalSig(''); }
      await reload();
    } catch (e) {
      setGlobalError(e.message || 'Failed to delete module');
    }
  };

  const renameCourse = async (courseId, title) => {
    try {
      await api.editorUpdateCourse(courseId, { title });
      await reload();
    } catch (e) {
      setGlobalError(e.message || 'Failed to rename course');
    }
  };

  const renameModule = async (moduleId, title) => {
    try {
      await api.editorUpdateModule(moduleId, { title });
      await reload();
    } catch (e) {
      setGlobalError(e.message || 'Failed to rename module');
    }
  };

  const addLesson = async (moduleId) => {
    try {
      const res = await api.editorCreateLesson({ moduleId, title: 'New lesson', slides: [] });
      const lesson = res.lesson;
      const fresh = await reload();
      const courseId = res.course?.id;
      if (lesson?.id) openLesson({ lesson, courseId, moduleId });
      void fresh;
    } catch (e) {
      setGlobalError(e.message || 'Failed to create lesson');
    }
  };

  const saveDraft = async () => {
    if (!selected?.lesson?.id || !draft) return;
    const allWarnings = draft.slides.flatMap((s, i) =>
      warnSlide(s).map((w) => `Slide ${i + 1}: ${w}`),
    );
    if (allWarnings.length) {
      setSaveMsg({ tone: 'warn', text: `Saved with ${allWarnings.length} issue${allWarnings.length > 1 ? 's' : ''} — check highlighted slides.` });
    }
    setSaving(true);
    if (!allWarnings.length) setSaveMsg(null);
    try {
      await api.editorUpdateLesson(selected.lesson.id, lessonPayload(draft));
      if (!allWarnings.length) setSaveMsg({ tone: 'ok', text: 'Saved' });
      await reload();
      setOriginalSig(lessonSignature(draft));
      return true;
    } catch (e) {
      const detail = e.details ? ` (${e.details.join('; ')})` : '';
      setSaveMsg({ tone: 'error', text: (e.message || 'Save failed') + detail });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const openQualityPanel = async () => {
    if (!selected?.lesson?.id) return;
    setShowQuality(true);
    setQualityValidation(null);
    try {
      const data = await api.editorLessonHistory(selected.lesson.id);
      setLessonHistory(data?.revisions || []);
    } catch (error) {
      if (error.status === 401) onUnauthorized();
    }
  };

  const validateQuality = async () => {
    if (!selected?.lesson?.id || !draft) return;
    setQualityBusy(true);
    try {
      const data = await api.editorValidateLesson(selected.lesson.id, lessonPayload(draft));
      setQualityValidation(data.validation);
    } catch (error) {
      setQualityValidation(error.validation || { ok: false, errors: [{ code: 'request_failed', message: error.message }], warnings: [] });
    } finally {
      setQualityBusy(false);
    }
  };

  const transitionLifecycle = async (status) => {
    if (!selected?.lesson?.id || !draft) return;
    if (['approved', 'published', 'superseded'].includes(status)
      && !window.confirm(`Confirm this lesson is ready to move to ${LIFECYCLE_LABELS[status]}?`)) return;
    setQualityBusy(true);
    try {
      if (dirty) {
        const saved = await saveDraft();
        if (!saved) return;
      }
      const data = await api.editorUpdateLessonLifecycle(selected.lesson.id, {
        status,
        humanReviewed: status === 'approved' ? draft.metadata?.humanReviewConfirmed === true : false,
        reviewNotes: status === 'approved' ? 'Human review confirmed in the editor.' : undefined,
      });
      setDraft((current) => ({ ...current, lifecycleStatus: status, contentVersion: data.lesson?.contentVersion || current.contentVersion }));
      setSelected((current) => ({ ...current, lesson: { ...current.lesson, ...data.lesson } }));
      setQualityValidation(data.validation || null);
      const historyData = await api.editorLessonHistory(selected.lesson.id);
      setLessonHistory(historyData?.revisions || []);
      await reload();
    } catch (error) {
      setQualityValidation(error.validation || { ok: false, errors: [{ code: 'transition_failed', message: error.message }], warnings: [] });
    } finally {
      setQualityBusy(false);
    }
  };

  const createLessonVersion = async () => {
    if (!selected?.lesson?.id || draft?.lifecycleStatus !== 'published') return;
    if (!window.confirm('Create an editable draft from this published lesson? The published version will stay live until the successor is approved and published.')) return;
    setQualityBusy(true);
    try {
      const data = await api.editorCreateLessonVersion(selected.lesson.id);
      await reload();
      setShowQuality(false);
      openLesson({
        lesson: { ...(data.lesson || {}), outcomeIds: data.lesson?.metadata?.outcomeIds || draft.outcomeIds || [] },
        courseId: selected.courseId,
        moduleId: selected.moduleId,
      });
      setSaveMsg({ tone: 'ok', text: 'New draft version created. The published version remains live.' });
    } catch (error) {
      setQualityValidation({ ok: false, errors: [{ code: 'new_version_failed', message: error.message }], warnings: [] });
    } finally {
      setQualityBusy(false);
    }
  };

  const deleteLesson = async () => {
    if (!selected?.lesson?.id) return;
    if (!window.confirm(`Delete "${selected.lesson.title}"? This cannot be undone.`)) return;
    try {
      await api.editorDeleteLesson(selected.lesson.id);
      setSelected(null);
      setDraft(null);
      setOriginalSig('');
      await reload();
    } catch (e) {
      setSaveMsg({ tone: 'error', text: e.message || 'Delete failed' });
    }
  };


  useEffect(() => {
    const handler = (e) => {
      if (!dirty) return undefined;
      e.preventDefault();
      e.returnValue = '';
      return '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const inLessonMode = !!selected;

  return (
    <div className="h-[100dvh] pt-14 md:pt-16 bg-surface-body text-text-primary flex flex-col overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="shrink-0 border-b border-line-soft bg-surface-body/95 backdrop-blur-md">
        <div className="px-4 md:px-6 h-12 flex items-center gap-2 md:gap-3 min-w-0">

          {inLessonMode ? (
            /* Lesson header: back + breadcrumb + actions */
            <>
              <button
                type="button"
                onClick={handleBack}
                className="shrink-0 text-[13px] font-medium text-text-dim hover:text-text-primary transition-colors duration-150"
              >
                ← Workspace
              </button>

              <span className="shrink-0 w-px h-3.5 bg-line-soft" />
              {selectedCourse && (
                <span className="text-[13px] font-bold text-text-dim truncate max-w-[90px] md:max-w-[160px]">{selectedCourse.title}</span>
              )}
              {selectedModule && (
                <>
                  <span className="text-text-dim/40 shrink-0 text-[11px]">/</span>
                  <span className="text-[13px] font-bold text-text-dim truncate max-w-[90px] md:max-w-[160px]">{selectedModule.title}</span>
                </>
              )}
              {dirty && (
                <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-medium text-amber-500/80">
                  <span className="w-1 h-1 rounded-full bg-amber-500 shrink-0" />
                  Unsaved
                </span>
              )}
              <div className="ml-auto flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAI((v) => !v)}
                  disabled={contentLocked}
                  title="AI assistant"
                  className={`h-8 px-3 rounded-full border text-sm font-medium transition-colors duration-150 flex items-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-40 ${
                    showAI
                      ? 'border-accent/60 bg-accent/[0.08] text-accent'
                      : 'border-line-soft text-text-muted hover:text-text-primary hover:border-text-dim'
                  }`}
                >
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                    <path d="M5.5 0.75 L6.4 3.6 L9.25 5.5 L6.4 7.4 L5.5 10.25 L4.6 7.4 L1.75 5.5 L4.6 3.6 Z" fill="currentColor" />
                  </svg>
                  AI
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                  className="h-8 px-3 rounded-full border border-line-soft text-text-muted hover:text-text-primary hover:border-text-dim text-sm font-medium transition-colors duration-150"
                >
                  Preview
                </button>
                <button
                  type="button"
                  onClick={openQualityPanel}
                  className="h-8 px-3 rounded-full border border-line-soft text-text-muted hover:text-text-primary hover:border-text-dim text-sm font-medium transition-colors duration-150"
                >
                  Quality
                </button>
                <button
                  type="button"
                  onClick={saveDraft}
                  disabled={saving || !dirty || contentLocked}
                  className="h-8 px-4 btn-primary text-sm font-medium disabled:opacity-40"
                >
                  {saving ? 'Saving…' : dirty ? 'Save' : 'Saved'}
                </button>
                <button
                  type="button"
                  onClick={deleteLesson}
                  disabled={draft?.lifecycleStatus === 'published'}
                  className="h-8 w-8 rounded-full border border-line-soft text-text-dim hover:text-rose-500 hover:border-rose-400/60 flex items-center justify-center text-base transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-35"
                  title="Delete lesson"
                >
                  ×
                </button>
              </div>
            </>
          ) : (
            /* Mode 1: workspace header */
            <>
              <p className="font-mono text-[10px] font-medium text-accent/60 uppercase tracking-[0.18em]">Workspace</p>
              <div className="ml-auto flex items-center gap-2">
                {!demoAccess && (
                  <Link
                    to="/editor/questions"
                    className="h-7 px-3 inline-flex items-center rounded-md border border-line-soft text-[12px] font-medium text-text-dim hover:text-text-primary hover:border-text-dim/40 transition-colors duration-150"
                  >
                    Question bank
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => reload()}
                  className="h-7 px-3 rounded-md border border-line-soft text-[12px] font-medium text-text-dim hover:text-text-primary hover:border-text-dim/40 transition-colors duration-150"
                >
                  Refresh
                </button>
                {!demoAccess && (
                  <button
                    type="button"
                    onClick={onUnauthorized}
                    className="h-7 px-3 rounded-md border border-line-soft text-[12px] font-medium text-text-dim hover:text-text-primary hover:border-text-dim/40 transition-colors duration-150"
                  >
                    Lock
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {globalError && (
          <p className="px-4 md:px-6 pb-2 text-sm text-rose-500">{globalError}</p>
        )}
      </header>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      {inLessonMode ? (
        <>
          <div className="flex-1 min-h-0 flex overflow-hidden">
            <fieldset disabled={contentLocked} className="contents">
              <LessonBuilder
                lessonId={selected.lesson.id}
                draft={draft}
                setDraft={setDraft}
                saveMsg={contentLocked ? { tone: 'warn', text: 'Published versions are read-only. Create a new draft version from Quality.' } : saveMsg}
                onNewSlide={lastAddedId}
                onAddSlide={addSlideFromType}
              />
            </fieldset>
            {showAI && (
              <div
                className="shrink-0 border-l border-line-soft flex flex-col relative"
                style={{ width: panelWidth }}
              >
                {/* Drag handle */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize z-10 hover:bg-accent/25 active:bg-accent/40 transition-colors duration-150"
                  onMouseDown={startResize}
                />
                <AIChatPanel
                  messages={aiMessages}
                  loading={aiLoading}
                  onSubmit={handleAISubmit}
                  onAddSlide={handleAIAddSlide}
                  onClear={() => setAiMessages([])}
                />
              </div>
            )}
          </div>
        </>
      ) : (
        <WorkspaceOverview
          courses={courses}
          loading={loading}
          onEdit={openLesson}
          onAddCourse={addCourse}
          onAddModule={addModule}
          onAddLesson={addLesson}
          onRenameCourse={renameCourse}
          onRenameModule={renameModule}
          onTogglePublish={togglePublish}
          onDeleteCourse={deleteCourse}
          onDeleteModule={deleteModule}
        />
      )}

      <LessonPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={draft?.title}
        slides={draft?.slides || []}
      />
      {showQuality && draft && (
        <ContentQualityDrawer
          draft={draft}
          setDraft={setDraft}
          outcomes={curriculumOutcomes}
          validation={qualityValidation}
          history={lessonHistory}
          busy={qualityBusy}
          onValidate={validateQuality}
          onTransition={transitionLifecycle}
          onCreateVersion={createLessonVersion}
          onClose={() => setShowQuality(false)}
        />
      )}
    </div>
  );
}
