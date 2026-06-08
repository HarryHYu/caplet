import { useEffect, useRef, useState } from 'react';
import api from '../../services/api';
import { extractPdfText } from '../../lib/pdfExtract';

const PRESETS = [
  {
    label: 'Full lesson',
    text: 'Create a complete lesson covering the topic end to end. Start with a hero introduction, then content slides explaining key concepts using text, charts, diagrams, Desmos graphs, and interactive simulations where relevant. Follow with varied practice activities (multiple choice, fill blanks, matching, ordering). End with a flashcard summary.',
  },
  {
    label: 'Presentation',
    text: 'Create a presentation for live delivery to an audience. Use strong hero and divider slides for structure, concise text slides with key bullet points, charts, diagrams, and interactive embeds. No practice questions or quizzes — this is designed to be presented, not self-studied.',
  },
  {
    label: 'Practice',
    text: 'Generate only practice and quiz slides — no reading content. Include a variety of: multiple choice (single and multi-select), fill in the blank (textbox and dropdown), matching pairs, ordering activities, and timeline activities. Every question must have correct answers and a clear educational explanation.',
  },
  {
    label: 'Exam prep',
    text: 'Generate hard exam-style practice only. Use common misconceptions as distractors, tricky wording, and multi-step reasoning. Mix multiple choice, fill blanks, and matching. Every answer needs a detailed explanation covering why the correct answer is right and why each wrong option is wrong.',
  },
  {
    label: 'Flashcards',
    text: 'Generate flashcard slides only using carousel mode for active recall. Cover all key terms, definitions, formulas, and concepts from the material. No other slide types.',
  },
  {
    label: 'Summary',
    text: 'Generate a condensed revision reference. Use dividers for sections, callout text slides for key takeaways, tables for comparisons, charts for numerical data. End with a grid flashcard slide of the most important terms. Keep it concise — no lengthy reading passages, minimal practice questions.',
  },
  {
    label: 'Introduction',
    text: 'Just introduce the topic for a first encounter with it. One hero slide to set the scene, a few content slides covering the core concepts accessibly, and one carousel flashcard set for key vocabulary. Brief and beginner-friendly — no advanced content.',
  },
  {
    label: 'Deep dive',
    text: 'Generate a comprehensive in-depth lesson covering the topic exhaustively. Explain every concept in text, supported by charts, Desmos graphs, diagrams, and PhET simulations where relevant. Follow with a full range of varied practice activities. Maximum depth and breadth — prioritise quality and completeness over brevity.',
  },
];

const MODEL_OPTIONS = [
  {
    id: 'gpt-5.4-nano',
    label: 'GPT-5.4 Nano',
    desc: 'Fastest & cheapest. Good for simple flashcards or quick summaries.',
    cost: 1,
  },
  {
    id: 'gpt-5.4-mini',
    label: 'GPT-5.4 Mini',
    desc: 'Great balance of speed and quality. Recommended default.',
    cost: 2,
  },
  {
    id: 'gpt-5.4',
    label: 'GPT-5.4',
    desc: 'Frontier quality. Better at complex lessons and curriculum accuracy.',
    cost: 3,
  },
  {
    id: 'gpt-5.5',
    label: 'GPT-5.5',
    desc: 'Most powerful. Best for nuanced, curriculum-accurate content.',
    cost: 4,
  },
];

const FORMATTER_OPTIONS = [
  {
    id: 'gpt-5.4-mini',
    label: 'GPT-5.4 Mini',
    desc: 'Faster JSON formatting. Recommended.',
  },
  {
    id: 'gpt-5.4-nano',
    label: 'GPT-5.4 Nano',
    desc: 'Cheapest formatting option.',
  },
];

const PLACEHOLDER_NOTES = `Examples of what works here:
• Paste lecture notes, textbook paragraphs, or dot points
• Describe a topic: "Explain opportunity cost for Year 11 Economics"
• Be specific: "10 practice MCQs on Newton's laws, NESA syllabus"`;

const LOADING_STAGES = [
  'Planning lesson…',
  'Planning lesson…',
  'Building slides…',
  'Building slides…',
  'Finishing up…',
];

export default function AIGeneratePanel({ open, onClose, lessonTitle, onApply }) {
  const [notes, setNotes] = useState('');
  const [curriculum, setCurriculum] = useState('');
  const [audience, setAudience] = useState('');
  const [outputDesc, setOutputDesc] = useState('');
  const [slideCount, setSlideCount] = useState(15);
  const [model, setModel] = useState('gpt-5.4-mini');
  const [formatterModel, setFormatterModel] = useState('gpt-5.4-mini');
  const [pdfState, setPdfState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState([]);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!loading) { setLoadingStage(0); return; }
    setLoadingStage(0);
    let i = 0;
    const id = setInterval(() => {
      i = Math.min(i + 1, LOADING_STAGES.length - 1);
      setLoadingStage(i);
    }, 7000);
    return () => clearInterval(id);
  }, [loading]);

  const totalChars = notes.length + (pdfState?.chars || 0);

  const handlePdf = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setPdfState('extracting');
    try {
      const text = await extractPdfText(file);
      if (!text.trim()) throw new Error('Could not extract any text from this PDF. It may be image-only — try pasting the text manually.');
      setPdfState({ name: file.name, chars: text.length, text });
    } catch (err) {
      setError(err.message || 'PDF extraction failed');
      setPdfState(null);
    } finally {
      e.target.value = '';
    }
  };

  const removePdf = () => setPdfState(null);

  const submit = async (mode) => {
    setError('');
    setWarnings([]);

    const sourceText = pdfState?.text || '';
    const combined = [sourceText, notes].filter(Boolean).join('\n\n').trim();

    if (!combined || combined.length < 20) {
      setError('Add some notes, a PDF, or describe what you want (at least 20 characters).');
      return;
    }
    if (combined.length > 30000) {
      setError('Content is too long (max ~30,000 characters). Trim your notes or use a shorter PDF section.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.aiGenerateLesson({
        notes: combined,
        title: lessonTitle,
        curriculum: curriculum.trim() || undefined,
        audience: audience.trim() || undefined,
        outputDescription: outputDesc.trim() || undefined,
        slideCount,
        model,
        formatterModel,
      });
      onApply(res.slides || [], mode);
      setWarnings(res.warnings || []);
      if (!res.warnings?.length) onClose();
    } catch (err) {
      setError(err.message || 'AI generation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      {/* Overlay */}
      <button
        type="button"
        aria-label="Close AI panel"
        onClick={onClose}
        className={`absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* Slide-in panel */}
      <aside className={`absolute top-0 right-0 h-full w-full sm:w-[520px] bg-surface-raised border-l border-line-soft shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : 'translate-x-full'}`}>

        {/* Accent top stripe */}
        <div className="h-px bg-gradient-to-r from-accent/80 via-accent/30 to-transparent shrink-0" />

        {/* Header */}
        <header className="shrink-0 px-6 pt-5 pb-4 border-b border-line-soft">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center shrink-0">
              <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                <path d="M5 0.75 L5.95 3.8 L9 5 L5.95 6.2 L5 9.25 L4.05 6.2 L1 5 L4.05 3.8 Z" fill="white" />
              </svg>
            </div>
            <p className="text-xs font-semibold text-accent">AI assist</p>
          </div>
          <h2 className="text-xl font-serif italic text-text-primary">Generate slides</h2>
          <p className="mt-1 text-sm text-text-muted">
            Paste notes, upload a PDF, or describe what you want. Uses a two-pass AI pipeline for better accuracy — you review and save.
          </p>
        </header>

        {/* Form */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-6">

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-text-muted mb-2">
              Notes or topic <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={7}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={PLACEHOLDER_NOTES}
              className="w-full rounded-xl border border-line-soft bg-surface-body px-4 py-2.5 text-base text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 resize-none"
            />
            <div className="flex items-center justify-between mt-1">
              <span className={`text-xs tabular-nums ${totalChars > 28000 ? 'text-amber-500 font-medium' : 'text-text-dim'}`}>
                {totalChars.toLocaleString()} / 30,000 chars
                {totalChars > 28000 && ' — getting long'}
              </span>
              {pdfState?.text && (
                <span className="text-xs text-text-dim">
                  incl. {pdfState.chars.toLocaleString()} from PDF
                </span>
              )}
            </div>
          </div>

          {/* PDF upload */}
          <div>
            <label className="block text-sm font-semibold text-text-muted mb-2">
              PDF <span className="text-text-dim font-normal">(optional)</span>
            </label>
            {pdfState === 'extracting' ? (
              <div className="flex items-center gap-2 text-sm text-text-muted py-2">
                <span className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                Extracting text…
              </div>
            ) : pdfState ? (
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg border border-emerald-500/40 bg-emerald-500/[0.06]">
                <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span className="flex-1 min-w-0 text-sm text-text-primary truncate" title={pdfState.name}>
                  {pdfState.name}
                </span>
                <span className="text-xs text-text-dim shrink-0">{pdfState.chars.toLocaleString()} chars</span>
                <button type="button" onClick={removePdf} className="text-text-dim hover:text-rose-500 shrink-0 text-base leading-none transition-colors duration-150">×</button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full py-2.5 rounded-lg border border-dashed border-line-soft text-sm text-text-muted hover:border-accent hover:text-accent transition-colors duration-150"
                >
                  Upload PDF
                </button>
                <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={handlePdf} />
                <p className="mt-1 text-xs text-text-dim">Text-based PDFs only. Scanned / image PDFs won't extract well.</p>
              </>
            )}
          </div>

          {/* Curriculum */}
          <div>
            <label className="block text-sm font-semibold text-text-muted mb-2">
              Curriculum / syllabus <span className="text-text-dim font-normal">(optional but recommended)</span>
            </label>
            <input
              type="text"
              value={curriculum}
              onChange={(e) => setCurriculum(e.target.value)}
              placeholder="e.g. NSW Year 11 Economics 2025, AP Physics 1, GCSE Chemistry AQA"
              className="w-full rounded-xl border border-line-soft bg-surface-raised px-4 py-2.5 text-base text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>

          {/* Audience */}
          <div>
            <label className="block text-sm font-semibold text-text-muted mb-2">
              Audience / year level <span className="text-text-dim font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="e.g. Year 10 students, University first year, Adult beginners"
              className="w-full rounded-xl border border-line-soft bg-surface-raised px-4 py-2.5 text-base text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>

          {/* Slide count */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-text-muted">Slide count</label>
              <span className="text-sm font-bold text-accent tabular-nums w-8 text-right">{slideCount}</span>
            </div>
            <input
              type="range"
              min={3}
              max={50}
              step={1}
              value={slideCount}
              onChange={(e) => setSlideCount(Number(e.target.value))}
              className="w-full accent-accent h-1.5 cursor-pointer"
            />
            <div className="flex justify-between text-xs text-text-dim mt-1">
              <span>3</span>
              <span className="text-text-dim/50">target — AI may vary slightly</span>
              <span>50</span>
            </div>
          </div>

          {/* Output format */}
          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">
              Output format <span className="text-text-dim font-normal">(optional)</span>
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setOutputDesc(p.text)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-sm font-medium transition-all duration-150 ${
                    outputDesc === p.text
                      ? 'border-accent/70 bg-accent/10 text-accent'
                      : 'border-line-soft text-text-muted hover:border-accent/40 hover:text-text-primary'
                  }`}
                >
                  {outputDesc === p.text && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="shrink-0">
                      <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  {p.label}
                </button>
              ))}
            </div>
            <textarea
              rows={4}
              value={outputDesc}
              onChange={(e) => setOutputDesc(e.target.value)}
              placeholder="Describe what you want — type of slides, structure, tone, how many of each type, what to include or skip… Presets above fill this box as a starting point you can edit."
              className="w-full rounded-xl border border-line-soft bg-surface-body px-4 py-2.5 text-base text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 resize-none"
            />
          </div>

          {/* Model */}
          <div>
            <label className="block text-sm font-semibold text-text-muted mb-2">
              Model <span className="text-text-dim font-normal">(cheapest → smartest, used for the planning pass)</span>
            </label>
            <div className="space-y-1.5">
              {MODEL_OPTIONS.map((m) => (
                <label
                  key={m.id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all duration-150 ${
                    model === m.id
                      ? 'border-accent/60 bg-accent/[0.04]'
                      : 'border-line-soft hover:border-accent/40'
                  }`}
                >
                  <input
                    type="radio"
                    name="model"
                    value={m.id}
                    checked={model === m.id}
                    onChange={() => setModel(m.id)}
                    className="sr-only"
                  />
                  {/* Custom radio indicator */}
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-150 ${
                    model === m.id ? 'border-accent' : 'border-line-soft'
                  }`}>
                    {model === m.id && <div className="w-1.5 h-1.5 rounded-full bg-accent" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium transition-colors duration-150 ${model === m.id ? 'text-text-primary' : 'text-text-muted'}`}>{m.label}</span>
                      <span className="flex gap-0.5 items-center">
                        {Array.from({ length: 4 }).map((_, k) => (
                          <span
                            key={k}
                            className={`rounded-full transition-all duration-150 ${
                              k < m.cost
                                ? `bg-accent ${k === m.cost - 1 ? 'w-2 h-2' : 'w-1.5 h-1.5'}`
                                : 'w-1.5 h-1.5 bg-line-soft'
                            }`}
                          />
                        ))}
                      </span>
                    </div>
                    <p className="text-xs text-text-dim leading-snug mt-0.5">{m.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Stage 2 formatter model */}
          <div>
            <label className="block text-sm font-semibold text-text-muted mb-2">
              Stage 2 model <span className="text-text-dim font-normal">(JSON formatting pass)</span>
            </label>
            <div className="space-y-1.5">
              {FORMATTER_OPTIONS.map((m) => (
                <label
                  key={m.id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all duration-150 ${
                    formatterModel === m.id
                      ? 'border-accent/60 bg-accent/[0.04]'
                      : 'border-line-soft hover:border-accent/40'
                  }`}
                >
                  <input
                    type="radio"
                    name="formatterModel"
                    value={m.id}
                    checked={formatterModel === m.id}
                    onChange={() => setFormatterModel(m.id)}
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-150 ${
                    formatterModel === m.id ? 'border-accent' : 'border-line-soft'
                  }`}>
                    {formatterModel === m.id && <div className="w-1.5 h-1.5 rounded-full bg-accent" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm font-medium transition-colors duration-150 ${formatterModel === m.id ? 'text-text-primary' : 'text-text-muted'}`}>{m.label}</span>
                    <p className="text-xs text-text-dim leading-snug mt-0.5">{m.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-rose-400/40 bg-rose-500/[0.06] p-3 text-sm text-rose-600 dark:text-rose-400">
              {error}
            </div>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="rounded-xl border border-amber-400/40 bg-amber-500/[0.06] p-3 text-xs text-amber-700 dark:text-amber-400 space-y-1">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Some slides were skipped</p>
              {warnings.map((w, i) => <p key={i}>{w}</p>)}
              <button type="button" onClick={onClose} className="mt-1 text-accent hover:underline text-sm transition-colors duration-150">
                Close and review →
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="shrink-0 px-6 py-4 border-t border-line-soft space-y-3">
          {loading && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-sm">
                <span className="w-3.5 h-3.5 border-[1.5px] border-accent border-t-transparent rounded-full animate-spin shrink-0" />
                <span className="font-medium text-text-primary">{LOADING_STAGES[loadingStage]}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${
                      loadingStage > i * 2 + 1 ? 'bg-accent'
                        : loadingStage >= i * 2 ? 'bg-accent animate-pulse'
                        : 'bg-line-soft'
                    }`} />
                    {i < 2 && (
                      <div className={`w-6 h-px transition-colors duration-700 ${loadingStage > i * 2 + 1 ? 'bg-accent/60' : 'bg-line-soft'}`} />
                    )}
                  </div>
                ))}
                <span className="ml-1 text-[11px] text-text-dim font-medium">
                  {loadingStage < 2 ? 'Planning' : loadingStage < 4 ? 'Building' : 'Finishing'}
                </span>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full border border-line-soft text-sm font-medium text-text-muted hover:text-text-primary hover:border-text-dim transition-colors duration-150"
            >
              Cancel
            </button>
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => submit('append')}
              disabled={loading || pdfState === 'extracting'}
              className="px-4 py-2 rounded-full border border-line-soft text-sm font-medium text-text-muted hover:text-text-primary hover:border-text-dim disabled:opacity-40 transition-colors duration-150"
            >
              Append
            </button>
            <button
              type="button"
              onClick={() => submit('replace')}
              disabled={loading || pdfState === 'extracting'}
              className="btn-primary px-5 py-2 text-sm font-medium disabled:opacity-40"
            >
              Generate lesson
            </button>
          </div>
        </footer>
      </aside>
    </div>
  );
}
