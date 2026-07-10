import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useReveal } from '../lib/useReveal';
import api from '../services/api';
import ToolCard from '../components/ToolCard';

const eduTools = [
  {
    title: 'CapletMark',
    description: 'Paste an HSC Economics answer and get an estimated mark, band feedback, what was missing, and a stronger model answer.',
    path: '/edutools/economics-marker',
    category: 'Practice',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 4.556-3.03 8.25-9 9-5.97-.75-9-4.444-9-9V5.25a48.474 48.474 0 006-1.5A48.474 48.474 0 0012 3.75z" />
      </svg>
    ),
  },
  {
    title: 'Archived Slides',
    description: 'Spaced-repetition revision — flag slides while you learn, then review them right before they fade.',
    path: '/revision',
    category: 'Revision',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
  {
    title: 'Essay Memoriser',
    description: 'Paste in an essay and practise recalling it paragraph by paragraph, with AI feedback on every attempt.',
    path: '/essays',
    category: 'Revision',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
];

const categories = ['Practice', 'Revision'];

const EduTools = () => {
  useReveal();
  const [dueCount, setDueCount] = useState(0);
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.getDueReviewItems().catch(() => null),
      api.getSavedSlides().catch(() => null),
    ]).then(([dueData, savedData]) => {
      if (cancelled) return;
      setDueCount(dueData?.items?.length || 0);
      setSavedCount(savedData?.savedSlides?.length || 0);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const badges = { '/revision': dueCount, '/essays': savedCount };

  return (
    <div className="min-h-screen bg-surface-body py-32 selection:bg-accent selection:text-white">
      <div className="container-custom">

        {/* Header */}
        <header className="mb-16 reveal">
          <span className="font-hand text-accent text-xl mb-6 -rotate-2 inline-block">Learn it, then keep it</span>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <h1 className="font-display font-extrabold tracking-tight text-6xl lg:text-8xl mb-8">
                Education <br />tools.
              </h1>
              <p className="text-xl text-text-muted max-w-xl leading-relaxed">
                Free tools for practising and reviewing what you've learned — AI-marked answers, flagged slides, and essay practice.
              </p>
            </div>
            <div className="shrink-0 hidden md:block">
              <div className="block-blue rounded-3xl px-8 py-6 text-center shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
                <span className="text-5xl font-display font-extrabold tracking-tight text-blue">{eduTools.length}</span>
                <p className="text-xs font-bold text-text-muted mt-1 uppercase tracking-wide">Tools</p>
              </div>
            </div>
          </div>
        </header>

        <div className="reveal mb-12 flex flex-col gap-5 rounded-3xl block-amber p-7 md:flex-row md:items-center md:justify-between">
          <p className="max-w-3xl text-sm font-semibold leading-relaxed text-text-muted">
            AI feedback is practice guidance, not an official result. Check important feedback with a teacher and the original source.
          </p>
          <Link to="/trust#ai" className="shrink-0 text-sm font-bold text-accent hover:text-accent-strong">
            Understand AI limitations →
          </Link>
        </div>

        {/* Tool grid — grouped by category */}
        <div className="space-y-16">
          {categories.map(cat => {
            const group = eduTools.filter(t => t.category === cat);
            return (
              <div key={cat}>
                <div className="flex items-center gap-4 mb-6">
                  <h2 className="font-display font-bold tracking-tight text-lg text-text-primary">{cat}</h2>
                  <span className="block-blue text-xs font-bold text-blue rounded-full px-3 py-1">{group.length}</span>
                </div>
                <div className="reveal-stagger grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.map(tool => (
                    <ToolCard key={tool.path} tool={tool} badge={badges[tool.path]} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};

export default EduTools;
