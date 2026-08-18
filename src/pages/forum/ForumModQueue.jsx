import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckIcon, XMarkIcon, ExclamationTriangleIcon, NoSymbolIcon, SpeakerXMarkIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import CapletLoader from '../../components/CapletLoader';
import ForumBlockRenderer from './blocks/ForumBlockRenderer';
import { authorName, relativeTime, reasonLabel } from './forumTheme';

const TABS = [
  { key: 'pending', label: 'Pending review' },
  { key: 'reports', label: 'Reports' },
  { key: 'sanctions', label: 'Sanctions' },
];

function RejectButton({ onReject }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1 rounded-full bg-surface-error px-3 py-1.5 text-xs font-bold text-text-error">
        <XMarkIcon className="h-3.5 w-3.5" /> Reject
      </button>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason (optional)" className="w-40 rounded-lg px-2 py-1 text-xs" />
      <button type="button" onClick={() => { onReject(note); setOpen(false); }} className="rounded-full bg-surface-error px-3 py-1.5 text-xs font-bold text-text-error">Confirm</button>
      <button type="button" onClick={() => setOpen(false)} className="text-xs text-text-muted">Cancel</button>
    </div>
  );
}

function PendingTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await api.getForumModerationPending()); } catch (err) { setError(err.message || 'Could not load the queue.'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading && !data) return <div className="flex justify-center py-10"><CapletLoader message="Loading queue..." /></div>;
  if (error) return <p className="text-text-error">{error}</p>;
  if (!data) return null;

  const act = async (fn) => { try { await fn(); load(); } catch (err) { setError(err.message || 'Action failed.'); } };

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h3 className="forum-meta mb-2 uppercase">Pending threads ({data.threads.length})</h3>
        {data.threads.length === 0 && <p className="text-sm text-text-muted">Nothing pending.</p>}
        <ul className="flex flex-col gap-3">
          {data.threads.map((t) => (
            <li key={t.id} className="forum-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Link to={`/forum/t/${t.id}`} className="font-display font-bold text-text-primary hover:text-[color:var(--forum-accent)]">{t.title}</Link>
                {t.autoFlagged && (
                  <span className="forum-pill text-[10px] text-text-error" style={{ borderColor: 'var(--border-error)' }}>
                    <ExclamationTriangleIcon className="h-3 w-3" /> {t.autoFlagReasons?.join(', ')}
                  </span>
                )}
              </div>
              <p className="forum-meta mt-1">
                {authorName(t.author, { isAnonymous: t.isAnonymous })} · {t.category?.name} · {relativeTime(t.createdAt)}
              </p>
              <div className="mt-2 max-h-96 overflow-y-auto rounded-xl border border-line-soft bg-surface-soft p-3">
                <ForumBlockRenderer blocks={t.contentBlocks} fallbackText={t.body} className="text-sm" />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button type="button" onClick={() => act(() => api.approveForumThread(t.id))} className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold text-accent-contrast" style={{ background: 'var(--forum-green)' }}>
                  <CheckIcon className="h-3.5 w-3.5" /> Approve
                </button>
                <RejectButton onReject={(note) => act(() => api.rejectForumThread(t.id, note))} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="forum-meta mb-2 uppercase">Pending replies ({data.posts.length})</h3>
        {data.posts.length === 0 && <p className="text-sm text-text-muted">Nothing pending.</p>}
        <ul className="flex flex-col gap-3">
          {data.posts.map((p) => (
            <li key={p.id} className="forum-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Link to={`/forum/t/${p.threadId}`} className="font-display font-bold text-text-primary hover:text-[color:var(--forum-accent)]">re: {p.threadTitle}</Link>
                {p.autoFlagged && (
                  <span className="forum-pill text-[10px] text-text-error" style={{ borderColor: 'var(--border-error)' }}>
                    <ExclamationTriangleIcon className="h-3 w-3" /> {p.autoFlagReasons?.join(', ')}
                  </span>
                )}
              </div>
              <p className="forum-meta mt-1">
                {authorName(p.author, { isAnonymous: p.isAnonymous })} · {relativeTime(p.createdAt)}
              </p>
              <div className="mt-2 max-h-96 overflow-y-auto rounded-xl border border-line-soft bg-surface-soft p-3">
                <ForumBlockRenderer blocks={p.contentBlocks} fallbackText={p.content} className="text-sm" />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button type="button" onClick={() => act(() => api.approveForumPost(p.id))} className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold text-accent-contrast" style={{ background: 'var(--forum-green)' }}>
                  <CheckIcon className="h-3.5 w-3.5" /> Approve
                </button>
                <RejectButton onReject={(note) => act(() => api.rejectForumPost(p.id, note))} />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function ReportsTab() {
  const [reports, setReports] = useState(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try { const res = await api.getForumModerationReports('pending'); setReports(res.reports); } catch (err) { setError(err.message || 'Could not load reports.'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const resolve = async (id, status) => {
    try { await api.resolveForumModerationReport(id, { status }); load(); } catch (err) { setError(err.message || 'Action failed.'); }
  };
  const sanctionAuthor = async (report, type) => {
    if (!report.contentAuthor) return;
    const reason = window.prompt(`Reason for ${type}ing ${authorName(report.contentAuthor)}?`, reasonLabel(report.reason));
    if (reason === null) return;
    try {
      await api.issueForumSanction(report.contentAuthor.id, { type, reason });
      await resolve(report.id, 'actioned');
    } catch (err) { setError(err.message || 'Could not apply sanction.'); }
  };

  if (error) return <p className="text-text-error">{error}</p>;
  if (!reports) return <div className="flex justify-center py-10"><CapletLoader message="Loading reports..." /></div>;
  if (reports.length === 0) return <p className="text-sm text-text-muted">No pending reports.</p>;

  return (
    <ul className="flex flex-col gap-3">
      {reports.map((r) => (
        <li key={r.id} className="forum-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="forum-pill text-[10px]" style={{ color: r.priority === 'high' ? 'var(--text-error)' : 'var(--forum-accent)', borderColor: 'transparent', background: r.priority === 'high' ? 'var(--surface-error)' : 'var(--forum-accent-soft)' }}>
              {reasonLabel(r.reason)}
            </span>
            <span className="forum-meta">reported by {authorName(r.reporter)} · {relativeTime(r.createdAt)}</span>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm text-text-muted">"{r.contentSnapshot}"</p>
          {r.details && <p className="mt-1 text-xs italic text-text-dim">Reporter note: {r.details}</p>}
          <p className="forum-meta mt-1">Author: {authorName(r.contentAuthor)}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => resolve(r.id, 'dismissed')} className="forum-pill text-text-muted">Dismiss</button>
            <button type="button" onClick={() => resolve(r.id, 'actioned')} className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold text-accent-contrast" style={{ background: 'var(--forum-accent)' }}>
              Mark actioned
            </button>
            {r.contentAuthor && (
              <>
                <button type="button" onClick={() => sanctionAuthor(r, 'mute')} className="inline-flex items-center gap-1 rounded-full bg-[color:var(--forum-amber-soft)] px-3 py-1.5 text-xs font-bold text-text-primary">
                  <SpeakerXMarkIcon className="h-3.5 w-3.5" /> Mute author
                </button>
                <button type="button" onClick={() => sanctionAuthor(r, 'ban')} className="inline-flex items-center gap-1 rounded-full bg-surface-error px-3 py-1.5 text-xs font-bold text-text-error">
                  <NoSymbolIcon className="h-3.5 w-3.5" /> Ban author
                </button>
              </>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function SanctionsTab() {
  const [sanctions, setSanctions] = useState(null);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState('');
  const [type, setType] = useState('mute');
  const [reason, setReason] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try { const res = await api.getForumSanctions(); setSanctions(res.sanctions); } catch (err) { setError(err.message || 'Could not load sanctions.'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.issueForumSanction(userId.trim(), { type, reason: reason.trim(), expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null });
      setUserId(''); setReason(''); setExpiresAt('');
      load();
    } catch (err) { setError(err.message || 'Could not issue sanction.'); } finally { setSubmitting(false); }
  };

  const lift = async (id) => { try { await api.liftForumSanction(id); load(); } catch (err) { setError(err.message || 'Could not lift sanction.'); } };

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={submit} className="forum-card flex flex-col gap-3 p-4">
        <p className="forum-meta">Issue a sanction directly by user ID (or use "Mute/Ban author" from a report).</p>
        <div className="flex flex-wrap gap-2">
          <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="User ID" required className="min-w-48 flex-1 rounded-lg px-3 py-2 text-sm" />
          <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-lg px-3 py-2 text-sm">
            <option value="mute">Mute</option>
            <option value="ban">Ban</option>
          </select>
          <input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="rounded-lg px-3 py-2 text-sm" title="Expires at (optional)" />
        </div>
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" required className="rounded-lg px-3 py-2 text-sm" />
        {error && <p className="text-xs font-semibold text-text-error">{error}</p>}
        <button type="submit" disabled={submitting} className="self-start rounded-xl px-4 py-2 text-sm font-bold text-accent-contrast" style={{ background: 'var(--forum-accent)' }}>
          {submitting ? 'Applying…' : 'Apply sanction'}
        </button>
      </form>

      <div>
        <h3 className="forum-meta mb-2 uppercase">Active sanctions</h3>
        {!sanctions ? <CapletLoader message="Loading..." /> : sanctions.length === 0 ? <p className="text-sm text-text-muted">No active sanctions.</p> : (
          <ul className="flex flex-col gap-2">
            {sanctions.map((s) => (
              <li key={s.id} className="forum-card flex items-center justify-between gap-3 p-3">
                <div>
                  <p className="text-sm font-bold text-text-primary">{s.type === 'ban' ? 'Banned' : 'Muted'}: {authorName(s.user)}</p>
                  <p className="forum-meta">{s.reason} · by {authorName(s.issuedBy)} · {relativeTime(s.createdAt)}{s.expiresAt ? ` · expires ${new Date(s.expiresAt).toLocaleString()}` : ''}</p>
                </div>
                <button type="button" onClick={() => lift(s.id)} className="forum-pill shrink-0 text-text-muted">Lift</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function ForumModQueue() {
  const [tab, setTab] = useState('pending');
  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-extrabold tracking-tight text-text-primary md:text-3xl">Moderator queue</h1>
      <div className="mb-6 flex items-center gap-1 border-b border-line-soft">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-bold transition-colors ${tab === t.key ? 'border-[color:var(--forum-accent)] text-[color:var(--forum-accent)]' : 'border-transparent text-text-muted hover:text-text-primary'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'pending' && <PendingTab />}
      {tab === 'reports' && <ReportsTab />}
      {tab === 'sanctions' && <SanctionsTab />}
    </div>
  );
}
