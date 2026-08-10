import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { BookmarkIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import CapletLoader from '../../components/CapletLoader';
import ForumPageShell from './ForumPageShell';
import ForumSidebarLeft from './ForumSidebarLeft';
import ForumPostCard from './ForumPostCard';

/** Personal exam-revision list — repurposed Reddit "saved" feature. */
export default function ForumSavedPage() {
  const { categories, status } = useOutletContext();
  const [threads, setThreads] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    api.getForumSavedThreads()
      .then((res) => { if (alive) setThreads(res.threads); })
      .catch((err) => { if (alive) setError(err.message || 'Could not load your revision list.'); });
    return () => { alive = false; };
  }, []);

  return (
    <ForumPageShell left={<ForumSidebarLeft categories={categories} isModerator={status?.isModerator} />}>
      <div className="mb-6">
        <p className="forum-meta flex items-center gap-1.5"><BookmarkIcon className="h-3.5 w-3.5" /> Saved for later</p>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-text-primary">My Revision List</h1>
        <p className="mt-1 text-sm text-text-muted">Threads you've bookmarked to revisit before exams.</p>
      </div>

      {error ? (
        <div className="forum-card p-10 text-center text-text-error">{error}</div>
      ) : !threads ? (
        <div className="flex min-h-[30vh] items-center justify-center"><CapletLoader message="Loading your revision list..." /></div>
      ) : threads.length === 0 ? (
        <div className="forum-card p-10 text-center text-text-muted">Nothing saved yet. Tap "Save" on a thread to add it here.</div>
      ) : (
        <ul className="flex flex-col gap-2">
          {threads.map((t) => (
            <li key={t.id}>
              <ForumPostCard thread={t} />
            </li>
          ))}
        </ul>
      )}
    </ForumPageShell>
  );
}
