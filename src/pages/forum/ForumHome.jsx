import { useCallback, useEffect, useState } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import { PlusIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import CapletLoader from '../../components/CapletLoader';
import ForumPageShell from './ForumPageShell';
import ForumSidebarLeft from './ForumSidebarLeft';
import { ForumSidebarRightHome } from './ForumSidebarRight';
import ForumSortTabs from './ForumSortTabs';
import ForumFilterBar from './ForumFilterBar';
import ForumPostCard from './ForumPostCard';

export default function ForumHome() {
  const { categories, status } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const sort = searchParams.get('sort') || 'hot';
  const tag = searchParams.get('tag') || '';
  const solved = searchParams.get('solved') || '';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    setSearchParams(next);
  };

  const load = useCallback(async (targetPage) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getForumThreads({ sort, page: targetPage, tag: tag || undefined, solved: solved || undefined });
      setData(res);
    } catch (err) {
      setError(err.message || 'Could not load the forum.');
    } finally {
      setLoading(false);
    }
  }, [sort, tag, solved]);

  useEffect(() => {
    setPage(1);
    load(1);
  }, [load]);

  return (
    <ForumPageShell
      left={<ForumSidebarLeft categories={categories} isModerator={status?.isModerator} />}
      right={<ForumSidebarRightHome categories={categories} />}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <span className="font-hand -rotate-2 inline-block text-lg text-[color:var(--forum-accent)]">ask, answer, help each other out</span>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-text-primary">The Study Forum</h1>
        </div>
        {(() => {
          const defaultCategory = categories.find((c) => c.slug === 'general' && !c.isLocked) || categories.find((c) => !c.isLocked);
          if (!defaultCategory) return null;
          return (
            <Link
              to={`/forum/c/${defaultCategory.slug}/new`}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-2xl px-3.5 py-2 text-sm font-bold text-accent-contrast lg:hidden"
              style={{ background: 'var(--forum-accent)' }}
            >
              <PlusIcon className="h-4 w-4" /> Post
            </Link>
          );
        })()}
      </div>

      <ForumSortTabs value={sort} onChange={(next) => setFilter('sort', next === 'hot' ? '' : next)} />
      <ForumFilterBar tag={tag} onTagChange={(v) => setFilter('tag', v)} solved={solved} onSolvedChange={(v) => setFilter('solved', v)} />

      {loading && !data ? (
        <div className="flex min-h-[30vh] items-center justify-center"><CapletLoader message="Loading the feed..." /></div>
      ) : error ? (
        <div className="forum-card p-10 text-center text-text-error">{error}</div>
      ) : data.threads.length === 0 ? (
        <div className="forum-card p-10 text-center text-text-muted">No threads match these filters yet.</div>
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {data.threads.map((t) => (
              <li key={t.id}>
                <ForumPostCard thread={t} />
              </li>
            ))}
          </ul>

          {data.total > data.limit && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <button type="button" disabled={page <= 1} onClick={() => { const p = page - 1; setPage(p); load(p); }} className="forum-pill disabled:opacity-40">Previous</button>
              <span className="forum-meta">Page {page} of {Math.max(1, Math.ceil(data.total / data.limit))}</span>
              <button type="button" disabled={page >= Math.ceil(data.total / data.limit)} onClick={() => { const p = page + 1; setPage(p); load(p); }} className="forum-pill disabled:opacity-40">Next</button>
            </div>
          )}
        </>
      )}
    </ForumPageShell>
  );
}
