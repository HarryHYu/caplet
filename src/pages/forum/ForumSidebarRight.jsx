import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, LockClosedIcon, BellIcon } from '@heroicons/react/24/outline';
import { BellIcon as BellSolid } from '@heroicons/react/24/solid';
import api from '../../services/api';
import { relativeTime } from './forumTheme';

function FollowButton({ categoryId }) {
  const [following, setFollowing] = useState(null);

  useEffect(() => {
    let alive = true;
    api.getForumSubscriptions()
      .then((res) => { if (alive) setFollowing(res.categoryIds.includes(categoryId)); })
      .catch(() => { if (alive) setFollowing(false); });
    return () => { alive = false; };
  }, [categoryId]);

  const toggle = async () => {
    const next = !following;
    setFollowing(next);
    try {
      await api.followForumCategory(categoryId, next);
    } catch {
      setFollowing(!next);
    }
  };

  if (following === null) return null;
  return (
    <button
      type="button"
      onClick={toggle}
      className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition-colors duration-150 ${following ? 'text-accent-contrast' : 'text-text-primary hover:bg-surface-soft'}`}
      style={following ? { background: 'var(--forum-accent)' } : { border: '1px solid var(--line-soft)' }}
    >
      {following ? <BellSolid className="h-4 w-4" /> : <BellIcon className="h-4 w-4" />} {following ? 'Following' : 'Follow subject'}
    </button>
  );
}

const GUIDELINES = [
  'Be respectful — no bullying or harassment.',
  'Stay on topic for the board you\'re posting in.',
  'Never share exam or assessment answers.',
  'Every post is reviewed before it\'s visible to others.',
];

function GuidelinesCard() {
  return (
    <div className="forum-card p-4">
      <h3 className="forum-meta mb-2 uppercase">Community guidelines</h3>
      <ol className="flex flex-col gap-1.5 text-sm text-text-muted">
        {GUIDELINES.map((rule, i) => (
          <li key={rule} className="flex gap-2">
            <span className="font-mono text-xs font-bold text-[color:var(--forum-accent)]">{i + 1}.</span>
            {rule}
          </li>
        ))}
      </ol>
    </div>
  );
}

function CreatePostCta({ href, disabled, disabledLabel }) {
  if (disabled) {
    return (
      <div className="forum-card flex items-center gap-2 p-4 text-sm font-semibold text-text-dim">
        <LockClosedIcon className="h-4 w-4 shrink-0" /> {disabledLabel}
      </div>
    );
  }
  return (
    <Link
      to={href}
      className="flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-accent-contrast shadow-card press focus-ring"
      style={{ background: 'var(--forum-accent)' }}
    >
      <PlusIcon className="h-4 w-4" /> Create post
    </Link>
  );
}

/** Subject-specific context panel — description, stats, rules, and the Create Post CTA. */
export function ForumSidebarRightCategory({ category, isModerator }) {
  const canPost = !category.isLocked || isModerator;
  return (
    <div className="sticky top-20 flex flex-col gap-4">
      <CreatePostCta
        href={`/forum/c/${category.slug}/new`}
        disabled={!canPost}
        disabledLabel="Only moderators can post here"
      />
      <FollowButton categoryId={category.id} />
      <div className="forum-card p-4">
        <h2 className="font-display text-lg font-bold text-text-primary">{category.name}</h2>
        {category.description && <p className="mt-1.5 text-sm text-text-muted">{category.description}</p>}
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line-soft pt-4">
          <div>
            <p className="font-mono text-lg font-bold text-text-primary">{category.threadCount}</p>
            <p className="forum-meta">threads</p>
          </div>
          <div>
            <p className="font-mono text-lg font-bold text-text-primary">{category.postCount}</p>
            <p className="forum-meta">replies</p>
          </div>
        </div>
        {category.createdAt && (
          <p className="forum-meta mt-3 border-t border-line-soft pt-3">Board created {relativeTime(category.createdAt)}</p>
        )}
      </div>
      <GuidelinesCard />
    </div>
  );
}

/** Generic context panel for the aggregate home feed (no single subject selected). */
export function ForumSidebarRightHome({ categories }) {
  const totalThreads = categories.reduce((sum, c) => sum + (c.threadCount || 0), 0);
  const totalReplies = categories.reduce((sum, c) => sum + (c.postCount || 0), 0);
  const defaultCategory = categories.find((c) => c.slug === 'general' && !c.isLocked) || categories.find((c) => !c.isLocked);

  return (
    <div className="sticky top-20 flex flex-col gap-4">
      {defaultCategory ? (
        <CreatePostCta href={`/forum/c/${defaultCategory.slug}/new`} />
      ) : (
        <CreatePostCta disabled disabledLabel="Pick a subject to post in" />
      )}
      <div className="forum-card p-4">
        <h2 className="font-display text-lg font-bold text-text-primary">About the Study Forum</h2>
        <p className="mt-1.5 text-sm text-text-muted">
          Ask questions, share notes, and help each other out across every subject. Every post is reviewed by a moderator before anyone else can see it.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line-soft pt-4">
          <div>
            <p className="font-mono text-lg font-bold text-text-primary">{categories.length}</p>
            <p className="forum-meta">subjects</p>
          </div>
          <div>
            <p className="font-mono text-lg font-bold text-text-primary">{totalThreads}</p>
            <p className="forum-meta">threads</p>
          </div>
        </div>
        <p className="forum-meta mt-3 border-t border-line-soft pt-3">{totalReplies} replies posted so far</p>
      </div>
      <GuidelinesCard />
    </div>
  );
}
