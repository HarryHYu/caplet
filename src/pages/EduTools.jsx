import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useReveal } from '../lib/useReveal';
import api from '../services/api';

const eduTools = [
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

const categories = ['Revision'];

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
                Free tools for reviewing what you've learned — flagged slides and essay practice, both backed by spaced repetition.
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
                    <EduToolCard key={tool.path} tool={tool} badge={badges[tool.path]} />
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

const EduToolCard = ({ tool, badge }) => (
  <Link
    to={tool.path}
    className="group flex flex-col gap-4 p-6 bg-surface-raised rounded-2xl shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)] hover:-translate-y-0.5 transition-transform duration-200"
  >
    <div className="flex items-start justify-between">
      <div className="w-11 h-11 flex items-center justify-center rounded-xl bg-accent text-white shadow-[0_12px_24px_-16px_rgba(20,20,18,0.5)]">
        {tool.icon}
      </div>
      <div className="flex items-center gap-2">
        {badge > 0 && (
          <span className="grid h-6 min-w-[24px] place-items-center rounded-full bg-accent px-1.5 text-[11px] font-bold leading-none text-white">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
        <svg
          className="w-4 h-4 text-text-dim group-hover:text-accent group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L17 7M17 7H7M17 7v10" />
        </svg>
      </div>
    </div>

    <div className="flex-1">
      <h3 className="font-display font-bold tracking-tight text-base text-text-primary mb-1.5 group-hover:text-accent transition-colors duration-200">
        {tool.title}
      </h3>
      <p className="text-sm text-text-muted leading-relaxed line-clamp-2">
        {tool.description}
      </p>
    </div>
  </Link>
);

export default EduTools;
