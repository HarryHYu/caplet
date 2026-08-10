import { useEffect, useState } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import { TrophyIcon, SparklesIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import CapletLoader from '../../components/CapletLoader';
import ForumPageShell from './ForumPageShell';
import ForumSidebarLeft from './ForumSidebarLeft';
import ForumPostCard from './ForumPostCard';
import { authorName, relativeTime } from './forumTheme';

/** "Contribution" — study-citizenship reputation + badges, surfaced on a member's profile. */
export default function ForumProfilePage() {
  const { userId } = useParams();
  const { categories, status } = useOutletContext();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setData(null);
    setError('');
    api.getForumUserProfile(userId)
      .then((res) => { if (alive) setData(res); })
      .catch((err) => { if (alive) setError(err.message || 'Could not load this profile.'); });
    return () => { alive = false; };
  }, [userId]);

  const left = <ForumSidebarLeft categories={categories} isModerator={status?.isModerator} />;

  if (error) return <ForumPageShell left={left}><div className="forum-card p-10 text-center text-text-error">{error}</div></ForumPageShell>;
  if (!data) return <ForumPageShell left={left}><div className="flex min-h-[40vh] items-center justify-center"><CapletLoader message="Loading profile..." /></div></ForumPageShell>;

  const { user, memberSince, stats, recentThreads } = data;

  return (
    <ForumPageShell left={left}>
      <div className="forum-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-text-primary">{authorName(user)}</h1>
            <p className="forum-meta mt-1">Member since {relativeTime(memberSince)}</p>
          </div>
          <div className="rounded-2xl px-5 py-3 text-center" style={{ background: 'var(--forum-accent-soft)' }}>
            <p className="font-mono text-3xl font-extrabold text-[color:var(--forum-accent)]">{stats.contributionScore}</p>
            <p className="forum-meta">Contribution</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 border-t border-line-soft pt-5 sm:grid-cols-4">
          <div>
            <p className="font-mono text-xl font-bold text-text-primary">{stats.bestAnswerCount}</p>
            <p className="forum-meta">Best answers</p>
          </div>
          <div>
            <p className="font-mono text-xl font-bold text-text-primary">{stats.helpfulReactionsReceived}</p>
            <p className="forum-meta">Helpful reactions</p>
          </div>
          <div>
            <p className="font-mono text-xl font-bold text-text-primary">{stats.approvedThreadCount}</p>
            <p className="forum-meta">Threads</p>
          </div>
          <div>
            <p className="font-mono text-xl font-bold text-text-primary">{stats.approvedPostCount}</p>
            <p className="forum-meta">Replies</p>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="forum-meta mb-2 uppercase">Badges</h2>
        {stats.badges.length === 0 ? (
          <p className="forum-card p-6 text-center text-sm text-text-muted">No badges yet — answer a question or two to start earning them.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {stats.badges.map((badge) => (
              <div key={badge.key} className="forum-card flex items-start gap-3 p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: 'var(--forum-amber-soft)' }}>
                  <TrophyIcon className="h-4.5 w-4.5 text-[color:var(--forum-amber)]" />
                </span>
                <div>
                  <p className="font-bold text-text-primary">{badge.label}</p>
                  <p className="text-sm text-text-muted">{badge.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6">
        <h2 className="forum-meta mb-2 flex items-center gap-1.5 uppercase"><SparklesIcon className="h-3.5 w-3.5" /> Recent threads</h2>
        {recentThreads.length === 0 ? (
          <p className="forum-card p-6 text-center text-sm text-text-muted">No public threads yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {recentThreads.map((t) => (
              <li key={t.id}>
                <ForumPostCard thread={t} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </ForumPageShell>
  );
}
