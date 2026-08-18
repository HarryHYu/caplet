import { useCallback, useEffect, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import CapletLoader from '../../components/CapletLoader';
import ForumPageShell from './ForumPageShell';
import ForumSidebarLeft from './ForumSidebarLeft';
import ForumFilterBar from './ForumFilterBar';
import ForumPostCard from './ForumPostCard';

export default function ForumSearchPage() {
  const { categories, status } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const tag = searchParams.get('tag') || '';
  const solved = searchParams.get('solved') || '';
  const subject = searchParams.get('subject') || '';
  const [inputValue, setInputValue] = useState(q);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const setFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    setSearchParams(next);
  };

  const runSearch = useCallback(async () => {
    if (!q || q.trim().length < 2) { setData(null); return; }
    setLoading(true);
    setError('');
    try {
      const res = await api.searchForum({ q, tag: tag || undefined, solved: solved || undefined, subject: subject || undefined });
      setData(res);
    } catch (err) {
      setError(err.message || 'Search failed.');
    } finally {
      setLoading(false);
    }
  }, [q, tag, solved, subject]);

  useEffect(() => { runSearch(); }, [runSearch]);
  useEffect(() => { setInputValue(q); }, [q]);

  const left = <ForumSidebarLeft categories={categories} isModerator={status?.isModerator} />;

  return (
    <ForumPageShell left={left}>
      <form
        className="mb-4 flex items-center gap-2"
        onSubmit={(e) => { e.preventDefault(); setFilter('q', inputValue.trim()); }}
      >
        <div className="flex flex-1 items-center gap-2 rounded-2xl border border-line-soft bg-surface-input px-4 py-2.5">
          <MagnifyingGlassIcon className="h-4 w-4 shrink-0 text-text-dim" />
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Search threads..."
            className="w-full border-0 bg-transparent p-0 text-sm shadow-none focus:ring-0"
          />
        </div>
        <button type="submit" className="rounded-2xl px-4 py-2.5 text-sm font-bold text-accent-contrast" style={{ background: 'var(--forum-accent)' }}>Search</button>
      </form>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select value={subject} onChange={(e) => setFilter('subject', e.target.value)} className="rounded-xl px-3 py-1.5 text-xs">
          <option value="">All subjects</option>
          {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
        </select>
      </div>
      <ForumFilterBar tag={tag} onTagChange={(v) => setFilter('tag', v)} solved={solved} onSolvedChange={(v) => setFilter('solved', v)} />

      {!q ? (
        <div className="forum-card p-10 text-center text-text-muted">Search across every subject by title or body.</div>
      ) : loading ? (
        <div className="flex min-h-[30vh] items-center justify-center"><CapletLoader message="Searching..." /></div>
      ) : error ? (
        <div className="forum-card p-10 text-center text-text-error">{error}</div>
      ) : !data || data.threads.length === 0 ? (
        <div className="forum-card p-10 text-center text-text-muted">No threads found for "{q}".</div>
      ) : (
        <>
          <p className="forum-meta mb-3">{data.total} result{data.total === 1 ? '' : 's'} for "{q}"</p>
          <ul className="flex flex-col gap-2">
            {data.threads.map((t) => (
              <li key={t.id}>
                <ForumPostCard thread={t} />
              </li>
            ))}
          </ul>
        </>
      )}
    </ForumPageShell>
  );
}
