import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { normalizeSlide, warnSlide, SLIDE_DEFAULTS, SLIDE_PALETTE, slideKindLabel } from '../lib/slideSchema';
import SlideForm from '../components/editor/SlideForms';
import AIGeneratePanel from '../components/editor/AIGeneratePanel';
import LessonPreviewModal from '../components/editor/LessonPreviewModal';

/* ──────────────────────────────────────────────────────────────────────────
   Small util — stable local IDs for the slide list (React keys + reordering)
   ────────────────────────────────────────────────────────────────────────── */

let _lid = 0;
const localId = () => `s_${Date.now()}_${++_lid}`;

function decorate(slide) {
  const norm = normalizeSlide(slide) || { type: 'text', content: '' };
  return { _id: localId(), ...norm };
}
function strip(slides) {
  return slides.map(({ _id, ...rest }) => rest); // eslint-disable-line no-unused-vars
}

/* ──────────────────────────────────────────────────────────────────────────
   Slide preview text — short blurb shown in the collapsed slide card
   ────────────────────────────────────────────────────────────────────────── */

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

/* ──────────────────────────────────────────────────────────────────────────
   Code entry screen
   ────────────────────────────────────────────────────────────────────────── */

function CodeEntry({ onEnter }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.editorEnter(code.trim());
      onEnter();
    } catch (err) {
      setError(err.message || 'Could not enter workspace');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] pt-14 md:pt-16 bg-surface-body flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent mb-2">Lesson workspace</p>
        <h1 className="text-3xl font-display font-bold text-text-primary mb-2">Enter access code</h1>
        <p className="text-sm text-text-muted mb-6">
          The lesson builder is gated by an access code your admin shares with you.
        </p>
        <form onSubmit={submit} className="space-y-3 bg-surface-raised border border-line-soft rounded-2xl p-6 shadow-lg">
          <input
            type="password"
            autoComplete="off"
            placeholder="Paste code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full rounded-lg border border-line-soft bg-surface-body px-3 py-2.5 text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
          {error && <p className="text-sm text-rose-500">{error}</p>}
          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="btn-primary w-full py-3"
          >
            {loading ? 'Checking…' : 'Continue'}
          </button>
        </form>
        <Link to="/" className="inline-block mt-6 text-sm text-text-dim hover:text-accent">
          ← Back to home
        </Link>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Workspace tree (left rail)
   ────────────────────────────────────────────────────────────────────────── */

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
      className={`cursor-text hover:text-accent transition-colors ${className}`}
    >
      {value}
    </span>
  );
}

function WorkspaceTree({ courses, selectedLessonId, onSelect, onAddCourse, onAddModule, onAddLesson, onRenameCourse, onRenameModule, onTogglePublish, onDeleteCourse, onDeleteModule, loading }) {
  return (
    <aside className="w-72 shrink-0 border-r border-line-soft bg-surface-soft/50 overflow-y-auto">
      <div className="p-4 sticky top-0 bg-surface-soft/95 backdrop-blur-md border-b border-line-soft flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-text-dim">Workspace</p>
        <button
          type="button"
          onClick={onAddCourse}
          disabled={loading}
          className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent hover:underline disabled:opacity-40"
        >
          + Course
        </button>
      </div>
      <div className="p-3 space-y-3">
        {courses.length === 0 && !loading && (
          <p className="text-xs text-text-dim px-2 py-3">
            No courses yet. Click + Course to start.
          </p>
        )}
        {courses.map((c) => (
          <div key={c.id} className="rounded-xl bg-surface-raised border border-line-soft p-3">
            <div className="flex items-start justify-between gap-2 mb-2">
              <InlineRename
                value={c.title}
                onSave={(title) => onRenameCourse(c.id, title)}
                className="text-sm font-bold text-text-primary truncate flex-1 min-w-0"
              />
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onTogglePublish(c.id, c.isPublished)}
                    title={c.isPublished ? 'Published — click to unpublish' : 'Draft — click to publish'}
                    className={`text-[9px] font-bold uppercase tracking-[0.2em] px-2 py-0.5 rounded-full border ${
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
                    className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent hover:underline"
                  >
                    + Module
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteCourse(c.id, c.title)}
                    className="text-[10px] text-text-dim hover:text-rose-500 transition-colors"
                    title="Delete course"
                  >
                    ×
                  </button>
                </div>
            </div>
            <div className="space-y-2">
              {(c.modules || []).map((m) => (
                <div key={m.id}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <InlineRename
                      value={m.title}
                      onSave={(title) => onRenameModule(m.id, title)}
                      className="text-[11px] font-bold uppercase tracking-[0.15em] text-text-muted truncate flex-1 min-w-0"
                    />
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onAddLesson(m.id)}
                        className="text-[10px] text-accent hover:underline"
                      >
                        + Lesson
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteModule(m.id, m.title)}
                        className="text-[10px] text-text-dim hover:text-rose-500 transition-colors"
                        title="Delete module"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  <ul className="border-l border-line-soft pl-2 space-y-px">
                    {(m.lessons || []).map((l) => (
                      <li key={l.id}>
                        <button
                          type="button"
                          onClick={() => onSelect({ lesson: l, courseId: c.id, moduleId: m.id })}
                          className={`w-full text-left text-xs py-1.5 px-2 rounded-md transition-colors truncate ${
                            l.id === selectedLessonId
                              ? 'bg-accent/10 text-accent font-semibold'
                              : 'text-text-muted hover:bg-surface-soft hover:text-text-primary'
                          }`}
                          title={l.title}
                        >
                          {l.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="px-4 py-3 text-[10px] text-text-dim">Click any course or module name to rename it.</p>
    </aside>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Add slide palette (bottom of lesson builder)
   ────────────────────────────────────────────────────────────────────────── */

function AddSlidePalette({ onAdd }) {
  return (
    <div className="rounded-2xl border border-dashed border-line-soft bg-surface-soft/40 p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-text-dim mb-3">Add slide</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {SLIDE_PALETTE.map((p) => (
          <button
            key={p.type}
            type="button"
            onClick={() => onAdd(p.type)}
            className="group text-left p-3 rounded-xl border border-line-soft bg-surface-raised hover:border-accent hover:bg-accent/[0.04] transition-all"
            title={p.desc}
          >
            <p className="text-sm font-bold text-text-primary group-hover:text-accent transition-colors">
              {p.label}
            </p>
            <p className="text-[11px] text-text-dim mt-0.5 leading-tight">{p.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Single slide card (collapsed by default; expands into a form)
   ────────────────────────────────────────────────────────────────────────── */

function SlideCard({
  slide, index, total, expanded, onToggle, onMove, onDuplicate, onDelete, onChange, lessonId,
}) {
  const warnings = warnSlide(slide);
  const hasWarning = warnings.length > 0;

  return (
    <div
      className={`rounded-2xl border bg-surface-raised transition-all ${
        expanded ? 'border-accent shadow-lg' : hasWarning ? 'border-amber-400/60' : 'border-line-soft'
      }`}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="font-mono text-[11px] text-text-dim w-6">{String(index + 1).padStart(2, '0')}</span>
        <button
          type="button"
          onClick={onToggle}
          className="flex-1 min-w-0 text-left"
        >
          <div className="flex items-center gap-2 mb-0.5">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[10px] font-bold uppercase tracking-[0.2em]">
              {slideKindLabel(slide)}
            </span>
            {hasWarning && !expanded && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-600 text-[10px] font-bold uppercase tracking-[0.2em]">
                ⚠ {warnings.length} issue{warnings.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p className="text-sm text-text-primary truncate" title={slideSummary(slide)}>
            {slideSummary(slide)}
          </p>
        </button>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            className="w-8 h-8 rounded-full border border-line-soft text-text-dim hover:text-text-primary hover:border-text-dim disabled:opacity-30"
            aria-label="Move up"
          >↑</button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            className="w-8 h-8 rounded-full border border-line-soft text-text-dim hover:text-text-primary hover:border-text-dim disabled:opacity-30"
            aria-label="Move down"
          >↓</button>
          <button
            type="button"
            onClick={onDuplicate}
            className="w-8 h-8 rounded-full border border-line-soft text-text-dim hover:text-text-primary hover:border-text-dim"
            aria-label="Duplicate"
            title="Duplicate"
          >⎘</button>
          <button
            type="button"
            onClick={onDelete}
            className="w-8 h-8 rounded-full border border-line-soft text-text-dim hover:text-rose-500 hover:border-rose-400/60"
            aria-label="Delete"
            title="Delete"
          >×</button>
          <button
            type="button"
            onClick={onToggle}
            className="ml-1 w-8 h-8 rounded-full border border-line-soft text-text-dim hover:text-text-primary hover:border-text-dim"
            aria-label={expanded ? 'Collapse' : 'Expand'}
            title={expanded ? 'Collapse' : 'Edit'}
          >{expanded ? '▴' : '▾'}</button>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-line-soft px-4 py-4 space-y-4">
          {hasWarning && (
            <div className="rounded-xl border border-amber-400/40 bg-amber-400/[0.06] px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-600 mb-1">
                Heads up
              </p>
              <ul className="space-y-0.5">
                {warnings.map((w, i) => (
                  <li key={i} className="text-xs text-amber-700 dark:text-amber-400">{w}</li>
                ))}
              </ul>
              <p className="mt-2 text-[10px] text-amber-600/70">You can still save — this is just a reminder.</p>
            </div>
          )}
          <SlideForm slide={slide} onChange={onChange} lessonId={lessonId} />
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Lesson builder (centre)
   ────────────────────────────────────────────────────────────────────────── */

function LessonBuilder({
  lessonId, draft, setDraft, saving, dirty, saveMsg, onSave, onDelete, onOpenAI, onOpenPreview,
}) {
  const [expandedId, setExpandedId] = useState(null);

  const addSlide = (paletteType) => {
    let next;
    if (paletteType === 'choice-tf') {
      next = { ...SLIDE_DEFAULTS.choice(), mode: 'truefalse', options: ['True', 'False'], correctIndices: [0] };
    } else {
      next = SLIDE_DEFAULTS[paletteType]?.() || null;
    }
    if (!next) return;
    next._id = localId();
    setDraft((d) => ({ ...d, slides: [...d.slides, next] }));
    setExpandedId(next._id);
  };

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

  if (!draft) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-muted font-serif italic px-6">
        Pick a lesson from the workspace to start building.
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 md:py-10">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent mb-1">Lesson</p>
            <input
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              className="w-full bg-transparent text-2xl md:text-3xl font-display font-bold text-text-primary focus:outline-none border-b border-transparent focus:border-line-soft pb-1"
              placeholder="Untitled lesson"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenAI}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-full border border-accent/40 bg-accent/[0.05] text-accent text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-accent/10"
            >
              AI assist
            </button>
            <button
              type="button"
              onClick={onOpenPreview}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-full border border-line-soft text-text-muted hover:text-text-primary hover:border-text-dim text-[11px] font-bold uppercase tracking-[0.2em]"
            >
              Preview
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving || !dirty}
              className="btn-primary h-9 px-5 text-[11px] font-bold uppercase tracking-[0.2em] disabled:opacity-40"
            >
              {saving ? 'Saving…' : dirty ? 'Save lesson' : 'Saved'}
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center gap-2 h-9 px-3 rounded-full border border-line-soft text-text-dim hover:text-rose-500 hover:border-rose-400/60 text-[11px] font-bold uppercase tracking-[0.2em]"
              title="Delete lesson"
            >
              Delete
            </button>
          </div>
        </div>

        {saveMsg && (
          <p className={`mb-4 text-xs ${
            saveMsg.tone === 'error' ? 'text-rose-500'
            : saveMsg.tone === 'warn' ? 'text-amber-600'
            : 'text-emerald-500'
          }`}>
            {saveMsg.text}
          </p>
        )}

        {/* Slide list */}
        <div className="space-y-3">
          {draft.slides.length === 0 && (
            <div className="rounded-2xl border border-dashed border-line-soft bg-surface-soft/40 p-8 text-center">
              <p className="text-sm text-text-muted mb-1">No slides yet.</p>
              <p className="text-xs text-text-dim">
                Add one from the palette below, or use <span className="text-accent font-bold">AI assist</span> to paste notes.
              </p>
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
        </div>

        <div className="mt-6">
          <AddSlidePalette onAdd={addSlide} />
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Top-level page
   ────────────────────────────────────────────────────────────────────────── */

export default function Editor() {
  const [hasToken, setHasToken] = useState(
    typeof sessionStorage !== 'undefined' && !!sessionStorage.getItem('editorToken'),
  );
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [selected, setSelected] = useState(null); // { lesson, courseId, moduleId }
  const [draft, setDraft] = useState(null);       // { title, slides: [{ _id, ... }] }
  const [originalSig, setOriginalSig] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setGlobalError('');
    try {
      const data = await api.editorTree();
      setCourses(data.courses || []);
      return data.courses || [];
    } catch (e) {
      setGlobalError(e.message || 'Failed to load workspace');
      if (e.status === 401) {
        api.clearEditorToken();
        setHasToken(false);
        setCourses([]);
      }
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasToken) reload();
  }, [hasToken, reload]);

  // Dirty tracking via JSON signature of normalized slides + title
  const currentSig = useMemo(() => {
    if (!draft) return '';
    return JSON.stringify({ title: draft.title, slides: strip(draft.slides) });
  }, [draft]);
  const dirty = !!draft && currentSig !== originalSig;

  const openLesson = useCallback((selection) => {
    setSelected(selection);
    setSaveMsg(null);
    setAiOpen(false);
    setPreviewOpen(false);
    const slides = Array.isArray(selection.lesson.slides) ? selection.lesson.slides : [];
    const decorated = slides.map(decorate);
    const next = { title: selection.lesson.title || '', slides: decorated };
    setDraft(next);
    setOriginalSig(JSON.stringify({ title: next.title, slides: strip(next.slides) }));
  }, []);

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
      const res = await api.editorCreateLesson({
        moduleId,
        title: 'New lesson',
        slides: [],
      });
      const lesson = res.lesson;
      const fresh = await reload();
      const courseId = res.course?.id;
      if (lesson?.id) {
        openLesson({ lesson, courseId, moduleId });
      }
      void fresh;
    } catch (e) {
      setGlobalError(e.message || 'Failed to create lesson');
    }
  };

  const saveDraft = async () => {
    if (!selected?.lesson?.id || !draft) return;

    // Collect frontend warnings but don't block saving — teachers can keep drafts.
    const allWarnings = draft.slides.flatMap((s, i) =>
      warnSlide(s).map((w) => `Slide ${i + 1}: ${w}`),
    );
    if (allWarnings.length) {
      setSaveMsg({ tone: 'warn', text: `Saved with ${allWarnings.length} issue${allWarnings.length > 1 ? 's' : ''} — check highlighted slides.` });
    }

    setSaving(true);
    if (!allWarnings.length) setSaveMsg(null);
    try {
      await api.editorUpdateLesson(selected.lesson.id, {
        title: draft.title,
        slides: strip(draft.slides),
      });
      if (!allWarnings.length) setSaveMsg({ tone: 'ok', text: 'Saved' });
      // Refresh tree and re-baseline dirty signature
      await reload();
      setOriginalSig(JSON.stringify({ title: draft.title, slides: strip(draft.slides) }));
    } catch (e) {
      const detail = e.details ? ` (${e.details.join('; ')})` : '';
      setSaveMsg({ tone: 'error', text: (e.message || 'Save failed') + detail });
    } finally {
      setSaving(false);
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

  const onAIApply = (slides, mode) => {
    setDraft((d) => {
      const decorated = slides.map(decorate);
      if (!d) return { title: '', slides: decorated };
      if (mode === 'replace') return { ...d, slides: decorated };
      return { ...d, slides: [...d.slides, ...decorated] };
    });
  };

  const leave = () => {
    api.clearEditorToken();
    setHasToken(false);
    setCourses([]);
    setSelected(null);
    setDraft(null);
    setOriginalSig('');
  };

  /* ───────── Warn on unload if dirty ───────── */
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

  if (!hasToken) {
    return <CodeEntry onEnter={() => setHasToken(true)} />;
  }

  return (
    <div className="h-[100dvh] pt-14 md:pt-16 bg-surface-body text-text-primary flex flex-col overflow-hidden">
      <header className="shrink-0 border-b border-line-soft bg-surface-body">
        <div className="px-4 md:px-6 h-12 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent">Lesson editor</p>
            {dirty && (
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-600">
                Unsaved changes
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => reload()}
              className="h-8 px-3 rounded-full border border-line-soft text-[11px] font-bold uppercase tracking-[0.2em] text-text-muted hover:text-text-primary hover:border-text-dim"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={leave}
              className="h-8 px-3 rounded-full border border-line-soft text-[11px] font-bold uppercase tracking-[0.2em] text-text-muted hover:text-text-primary hover:border-text-dim"
            >
              Leave
            </button>
          </div>
        </div>
        {globalError && (
          <p className="px-4 md:px-6 pb-2 text-xs text-rose-500">{globalError}</p>
        )}
      </header>

      <div className="flex-1 min-h-0 flex">
        <WorkspaceTree
          courses={courses}
          selectedLessonId={selected?.lesson?.id}
          onSelect={openLesson}
          onAddCourse={addCourse}
          onAddModule={addModule}
          onAddLesson={addLesson}
          onRenameCourse={renameCourse}
          onRenameModule={renameModule}
          onTogglePublish={togglePublish}
          onDeleteCourse={deleteCourse}
          onDeleteModule={deleteModule}
          loading={loading}
        />
        <LessonBuilder
          lessonId={selected?.lesson?.id}
          draft={draft}
          setDraft={setDraft}
          saving={saving}
          dirty={dirty}
          saveMsg={saveMsg}
          onSave={saveDraft}
          onDelete={deleteLesson}
          onOpenAI={() => setAiOpen(true)}
          onOpenPreview={() => setPreviewOpen(true)}
        />
      </div>

      <AIGeneratePanel
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        lessonTitle={draft?.title}
        onApply={onAIApply}
      />
      <LessonPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={draft?.title}
        slides={draft?.slides || []}
      />
    </div>
  );
}
