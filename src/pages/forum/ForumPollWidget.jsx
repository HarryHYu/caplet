import { useState } from 'react';
import api from '../../services/api';

/** "Study check" poll — which-answer-is-correct / confidence checks, attached to a thread. */
export default function ForumPollWidget({ poll: initialPoll }) {
  const [poll, setPoll] = useState(initialPoll);
  const [submitting, setSubmitting] = useState(false);
  if (!poll) return null;

  const vote = async (optionId) => {
    setSubmitting(true);
    try {
      const res = await api.voteForumPoll(poll.id, optionId);
      setPoll(res.poll);
    } finally {
      setSubmitting(false);
    }
  };

  const closed = poll.closesAt && new Date(poll.closesAt).getTime() < Date.now();

  return (
    <div className="forum-card p-4">
      <p className="forum-meta mb-3 uppercase">Poll · {poll.totalVotes} vote{poll.totalVotes === 1 ? '' : 's'}{closed ? ' · closed' : ''}</p>
      <p className="mb-3 font-display text-base font-bold text-text-primary">{poll.question}</p>
      <div className="flex flex-col gap-2">
        {poll.options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            disabled={submitting || closed}
            onClick={() => vote(opt.id)}
            className="relative overflow-hidden rounded-xl border border-line-soft px-3 py-2.5 text-left text-sm font-semibold text-text-primary transition-colors hover:bg-surface-soft disabled:cursor-default disabled:hover:bg-transparent"
          >
            <span className="absolute inset-y-0 left-0 transition-[width] duration-300" style={{ width: `${opt.percent}%`, background: opt.votedByMe ? 'var(--forum-accent-soft)' : 'var(--surface-soft)' }} />
            <span className="relative flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                {opt.votedByMe && <span style={{ color: 'var(--forum-accent)' }}>✓</span>}
                {opt.text}
              </span>
              <span className="forum-meta shrink-0">{opt.percent}% · {opt.voteCount}</span>
            </span>
          </button>
        ))}
      </div>
      {poll.closesAt && !closed && <p className="forum-meta mt-3">Closes {new Date(poll.closesAt).toLocaleString()}</p>}
    </div>
  );
}
