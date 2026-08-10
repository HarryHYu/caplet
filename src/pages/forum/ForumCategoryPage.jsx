import { useCallback, useEffect, useState } from 'react';
import { Link, useOutletContext, useParams, useSearchParams } from 'react-router-dom';
import { PlusIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import api from '../../services/api';
import CapletLoader from '../../components/CapletLoader';
import ForumPageShell from './ForumPageShell';
import ForumSidebarLeft from './ForumSidebarLeft';
import { ForumSidebarRightCategory } from './ForumSidebarRight';
import ForumSortTabs from './ForumSortTabs';
import ForumFilterBar from './ForumFilterBar';
import ForumPostCard from './ForumPostCard';

export default function ForumCategoryPage() {
  const { slug } = useParams();
  const { categories, status } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const sort = searchParams.get('sort') || 'hot';
  const tag = searchParams.get('tag') || '';
  const solved = searchParams.get('solved') || '';
  const [data, setData] = useState(null);
  const [megathreads, setMegathreads] = useState([]);
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
      const [res, megaRes] = await Promise.all([
        api.getForumCategoryThreads(slug, { sort, page: targetPage, tag: tag || undefined, solved: solved || undefined }),
        targetPage === 1 && !tag && !solved
          ? api.getForumCategoryThreads(slug, { sort: 'new', megathread: true, limit: 5 })
          : Promise.resolve(null),
      ]);
      setData(res);
      if (megaRes) setMegathreads(megaRes.threads);
    } catch (err) {
      setError(err.message || 'Could not load this board.');
    } finally {
      setLoading(false);
    }
  }, [slug, sort, tag, solved]);

  useEffect(() => {
    setPage(1);
    load(1);
  }, [load]);

  if (loading && !data) {
    return (
      <ForumPageShell left={<ForumSidebarLeft categories={categories} isModerator={status?.isModerator} />}>
        <div className="flex min-h-[40vh] items-center justify-center"><CapletLoader message="Loading the board..." /></div>
      </ForumPageShell>
    );
  }
  if (error) {
    return (
      <ForumPageShell left={<ForumSidebarLeft categories={categories} isModerator={status?.isModerator} />}>
        <div className="forum-card p-10 text-center text-text-error">{error}</div>
      </ForumPageShell>
    );
  }
  if (!data) return null;

  const { category, threads, total, limit } = data;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <ForumPageShell
      left={<ForumSidebarLeft categories={categories} isModerator={status?.isModerator} />}
      right={<ForumSidebarRightCategory category={category} isModerator={status?.isModerator} />}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="forum-meta">{category.name}</p>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-text-primary">{category.name}</h1>
        </div>
        {(!category.isLocked || status?.isModerator) && (
          <Link
            to={`/forum/c/${slug}/new`}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-2xl px-3.5 py-2 text-sm font-bold text-white lg:hidden"
            style={{ background: 'var(--forum-accent)' }}
          >
            <PlusIcon className="h-4 w-4" /> Post
          </Link>
        )}
      </div>

      {megathreads.length > 0 && (
        <div className="mb-5 flex flex-col gap-2 rounded-2xl border border-[color:var(--forum-amber)] bg-[color:var(--forum-amber-soft)] p-3">
          <p className="forum-meta flex items-center gap-1.5 px-1 text-text-primary"><StarSolid className="h-3.5 w-3.5 text-[color:var(--forum-amber)]" /> Master resources for {category.name}</p>
          {megathreads.map((t) => (
            <Link key={t.id} to={`/forum/t/${t.id}`} className="rounded-xl bg-surface-raised px-3 py-2.5 text-sm font-bold text-text-primary hover:bg-surface-soft">
              {t.title}
            </Link>
          ))}
        </div>
      )}

      <ForumSortTabs value={sort} onChange={(next) => setFilter('sort', next === 'hot' ? '' : next)} />
      <ForumFilterBar tag={tag} onTagChange={(v) => setFilter('tag', v)} solved={solved} onSolvedChange={(v) => setFilter('solved', v)} />

      {threads.length === 0 ? (
        <div className="forum-card p-10 text-center text-text-muted">No threads match these filters yet.</div>
      ) : (
        <ul className="flex flex-col gap-2">
          {threads.map((t) => (
            <li key={t.id}>
              <ForumPostCard thread={t} showCategory={false} />
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button type="button" disabled={page <= 1} onClick={() => { const p = page - 1; setPage(p); load(p); }} className="forum-pill disabled:opacity-40">Previous</button>
          <span className="forum-meta">Page {page} of {totalPages}</span>
          <button type="button" disabled={page >= totalPages} onClick={() => { const p = page + 1; setPage(p); load(p); }} className="forum-pill disabled:opacity-40">Next</button>
        </div>
      )}
    </ForumPageShell>
  );
}
