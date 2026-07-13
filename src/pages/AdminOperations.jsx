import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowPathIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  FlagIcon,
  PlusIcon,
  ServerStackIcon,
} from '@heroicons/react/24/outline';
import CapletLoader from '../components/CapletLoader';
import api from '../services/api';

function statusTone(ok) {
  return ok ? 'bg-[color:var(--block-green)] text-[color:var(--mark-green)]' : 'bg-[color:var(--block-amber)] text-[color:var(--mark-amber)]';
}

function HealthCard({ label, check }) {
  const ok = Boolean(check?.ok);
  return (
    <article className="rounded-2xl bg-surface-raised p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-lg font-extrabold text-text-primary">{label}</h3>
        <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${statusTone(ok)}`}>{check?.status || 'unknown'}</span>
      </div>
      <p className="mt-3 text-xs font-medium leading-relaxed text-text-muted">
        {check?.error || (check?.ageHours != null ? `${check.ageHours} hours old · maximum ${check.maxAgeHours} hours` : check?.durationMs != null ? `Checked in ${check.durationMs} ms` : 'No additional detail reported.')}
      </p>
    </article>
  );
}

function SignalCard({ label, value, detail }) {
  return (
    <article className="rounded-2xl bg-surface-raised p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-text-dim">{label}</p>
      <p className="mt-3 font-display text-3xl font-extrabold text-text-primary">{value}</p>
      <p className="mt-2 text-xs font-medium leading-relaxed text-text-muted">{detail}</p>
    </article>
  );
}

export default function AdminOperations() {
  const [health, setHealth] = useState(null);
  const [flags, setFlags] = useState([]);
  const [moderation, setModeration] = useState({ reports: [], guidance: null });
  const [observability, setObservability] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState('');
  const [notice, setNotice] = useState(null);
  const [form, setForm] = useState({ key: '', description: '', rolloutPercentage: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    setNotice(null);
    const [healthResult, flagsResult, moderationResult, observabilityResult] = await Promise.allSettled([
      api.request('/ops/admin/health'),
      api.request('/feature-flags/admin?includeArchived=true'),
      api.getAdminModerationReports('pending'),
      api.request('/ops/admin/observability'),
    ]);
    const healthValue = healthResult.status === 'fulfilled' ? healthResult.value : healthResult.reason?.data;
    if (healthValue) setHealth(healthValue);
    if (flagsResult.status === 'fulfilled') setFlags(flagsResult.value?.flags || []);
    if (moderationResult.status === 'fulfilled') {
      setModeration({
        reports: moderationResult.value?.reports || [],
        guidance: moderationResult.value?.guidance || null,
      });
    }
    if (observabilityResult.status === 'fulfilled') setObservability(observabilityResult.value);
    if (healthResult.status === 'rejected' && !healthValue) setNotice({ type: 'error', text: healthResult.reason?.message || 'Could not load operational health.' });
    if (flagsResult.status === 'rejected') setNotice({ type: 'error', text: flagsResult.reason?.message || 'Could not load feature flags.' });
    if (moderationResult.status === 'rejected') setNotice({ type: 'error', text: moderationResult.reason?.message || 'Could not load the independent safety queue.' });
    if (observabilityResult.status === 'rejected') setNotice({ type: 'error', text: observabilityResult.reason?.message || 'Could not load runtime signals.' });
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const createFlag = async (event) => {
    event.preventDefault();
    setBusyKey('create');
    setNotice(null);
    try {
      await api.request('/feature-flags/admin', {
        method: 'POST',
        body: JSON.stringify({
          key: form.key.trim(),
          description: form.description.trim() || null,
          enabled: false,
          isPublic: true,
          rolloutPercentage: Number(form.rolloutPercentage) || 0,
          publicValue: null,
          internalConfig: {},
        }),
      });
      setForm({ key: '', description: '', rolloutPercentage: 0 });
      await load();
      setNotice({ type: 'success', text: 'Feature flag created disabled. It is safe to configure before rollout.' });
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'Could not create the flag.' });
    } finally {
      setBusyKey('');
    }
  };

  const mutateFlag = async (flag, patch, action = 'update') => {
    setBusyKey(flag.key);
    setNotice(null);
    try {
      const endpoint = action === 'restore'
        ? `/feature-flags/admin/${encodeURIComponent(flag.key)}/restore`
        : `/feature-flags/admin/${encodeURIComponent(flag.key)}`;
      await api.request(endpoint, {
        method: action === 'archive' ? 'DELETE' : action === 'restore' ? 'POST' : 'PATCH',
        body: JSON.stringify({ ...(patch || {}), expectedVersion: flag.version }),
      });
      await load();
    } catch (error) {
      setNotice({ type: 'error', text: error.message || `Could not update ${flag.key}. Reload and try again.` });
    } finally {
      setBusyKey('');
    }
  };

  const reviewModerationReport = async (report, status) => {
    if (!report.classroomId) {
      setNotice({ type: 'error', text: 'This class no longer exists. Preserve the report and escalate it through the safeguarding process.' });
      return;
    }
    const key = `moderation:${report.id}`;
    setBusyKey(key);
    setNotice(null);
    try {
      await api.updateClassModerationReport(report.classroomId, report.id, { status });
      setModeration((current) => ({
        ...current,
        reports: current.reports.filter((item) => item.id !== report.id),
      }));
      setNotice({ type: 'success', text: 'The moderation decision was recorded in the audit history.' });
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'Could not record the moderation decision.' });
    } finally {
      setBusyKey('');
    }
  };

  const moderationReports = moderation.reports || [];
  const highPriorityReports = moderationReports.filter((report) => report.priority === 'high').length;
  const overdueReports = moderationReports.filter((report) => report.overdue).length;
  const httpSignals = observability?.runtime?.http;
  const aiSignals = observability?.runtime?.ai;
  const alertSignals = observability?.alerts;
  const openAlerts = (alertSignals?.alerts || []).filter((alert) => alert.status === 'open');

  if (loading && !health && !flags.length) {
    return <main className="grid min-h-screen place-items-center bg-surface-body" role="status"><CapletLoader message="Checking platform readiness…" /></main>;
  }

  return (
    <main className="min-h-screen bg-surface-body py-28">
      <div className="container-custom max-w-6xl">
        <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <Link to="/metrics" className="text-xs font-bold text-accent">← Platform metrics</Link>
            <p className="mt-4 font-hand text-xl text-accent -rotate-2 inline-block">release with evidence</p>
            <h1 className="mt-1 text-5xl font-display font-extrabold tracking-tight text-text-primary">Operations.</h1>
            <p className="mt-4 max-w-2xl text-sm font-medium leading-relaxed text-text-muted">Database, migration, backup, and controlled-rollout evidence for administrators.</p>
          </div>
          <button type="button" onClick={load} disabled={loading} className="btn-secondary"><ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" /> Refresh</button>
        </header>

        {notice && <div role={notice.type === 'error' ? 'alert' : 'status'} className={`mt-8 rounded-2xl px-5 py-4 text-sm font-bold ${notice.type === 'error' ? 'bg-surface-error text-text-error' : 'bg-[color:var(--block-green)] text-text-primary'}`}>{notice.text}</div>}

        <section className="mt-12" aria-labelledby="readiness-heading">
          <div className="flex items-center gap-3"><ServerStackIcon className="h-6 w-6 text-accent" aria-hidden="true" /><h2 id="readiness-heading" className="text-3xl font-display font-extrabold text-text-primary">Release readiness</h2></div>
          <div className={`mt-5 flex items-center gap-3 rounded-2xl p-5 ${statusTone(Boolean(health?.ready))}`}>
            {health?.ready ? <CheckCircleIcon className="h-6 w-6" aria-hidden="true" /> : <ExclamationTriangleIcon className="h-6 w-6" aria-hidden="true" />}
            <div><p className="text-sm font-extrabold">{health?.status === 'ready' ? 'Ready' : health?.status === 'degraded' ? 'Application ready; backup evidence needs attention' : 'Not ready'}</p><p className="mt-1 text-xs font-medium opacity-80">Checked {health?.checkedAt ? new Date(health.checkedAt).toLocaleString('en-AU') : 'just now'}</p></div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <HealthCard label="Database" check={health?.checks?.database} />
            <HealthCard label="Migrations" check={health?.checks?.migrations} />
            <HealthCard label="Backups" check={health?.checks?.backups} />
          </div>
        </section>

        <section className="mt-14" aria-labelledby="runtime-signals-heading">
          <div className="flex items-center gap-3">
            <ChartBarIcon className="h-6 w-6 text-accent" aria-hidden="true" />
            <h2 id="runtime-signals-heading" className="text-3xl font-display font-extrabold text-text-primary">Runtime signals</h2>
          </div>
          <p className="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-text-muted">
            Bounded, PII-free diagnostics from this backend process. They reset on restart; AI cost is a planning estimate from reserved quota units, not provider billing.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SignalCard label="Requests" value={httpSignals?.requests ?? '—'} detail={`Last ${httpSignals?.windowMinutes || 15} minutes`} />
            <SignalCard label="5xx error rate" value={httpSignals ? `${(Number(httpSignals.errorRate || 0) * 100).toFixed(1)}%` : '—'} detail={`${httpSignals?.errors || 0} server errors · ${httpSignals?.aborted || 0} aborted`} />
            <SignalCard label="p95 latency" value={httpSignals?.latencyMs?.p95 != null ? `${httpSignals.latencyMs.p95} ms` : '—'} detail={`p50 ${httpSignals?.latencyMs?.p50 ?? '—'} ms · p99 ${httpSignals?.latencyMs?.p99 ?? '—'} ms`} />
            <SignalCard label="AI quota units" value={aiSignals?.reservedUnits ?? '—'} detail={`${aiSignals?.completed || 0} completed · ${aiSignals?.failed || 0} failed`} />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <article className="rounded-2xl bg-surface-raised p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-display text-lg font-extrabold text-text-primary">AI budget and circuits</h3>
                <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${aiSignals?.circuits?.length ? 'bg-surface-error text-text-error' : 'bg-[color:var(--block-green)] text-[color:var(--mark-green)]'}`}>{aiSignals?.circuits?.length || 0} open</span>
              </div>
              <p className="mt-3 text-sm font-medium text-text-muted">
                {aiSignals?.cost?.estimatedUsd == null
                  ? 'Cost estimate disabled. Configure a validated blended cost per quota unit before using this for planning.'
                  : `Estimated $${Number(aiSignals.cost.estimatedUsd).toFixed(2)} USD in this process window · $${Number(aiSignals.cost.retainedMonthToDateEstimatedUsd || 0).toFixed(2)} retained month-to-date${aiSignals.cost.configuredMonthlyBudgetUsd ? ` · ${aiSignals.cost.budgetUsedPercentage}% of the configured monthly budget` : ''}.`}
              </p>
              <p className="mt-3 text-xs font-medium text-text-dim">
                Rejected: {aiSignals?.rejected?.quota || 0} quota · {aiSignals?.rejected?.concurrency || 0} concurrent · {aiSignals?.rejected?.circuit || 0} circuit
              </p>
            </article>

            <article className="rounded-2xl bg-surface-raised p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-display text-lg font-extrabold text-text-primary">Durable alert delivery</h3>
                <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${alertSignals?.delivery?.configured ? 'bg-[color:var(--block-green)] text-[color:var(--mark-green)]' : 'bg-[color:var(--block-amber)] text-[color:var(--mark-amber)]'}`}>{alertSignals?.delivery?.configured ? 'Configured' : 'Needs setup'}</span>
              </div>
              <p className="mt-3 text-sm font-medium text-text-muted">
                {alertSignals?.counts?.open || 0} readiness or backup incidents open · {alertSignals?.counts?.failedDelivery || 0} delivery failures retrying.
              </p>
              <p className="mt-3 text-xs font-medium text-text-dim">
                Moderation: {alertSignals?.moderation?.pendingReports || 0} reports awaiting review · {alertSignals?.moderation?.failedDelivery || 0} alert failures retrying · {alertSignals?.moderation?.deliveryConfigured ? `${alertSignals.moderation.channel} configured` : 'delivery needs setup'}
              </p>
            </article>
          </div>

          {openAlerts.length > 0 && (
            <div className="mt-4 space-y-3">
              {openAlerts.map((alert) => (
                <article key={alert.id} className="rounded-2xl border border-[color:var(--mark-amber)] bg-[color:var(--block-amber)] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><p className="text-xs font-extrabold uppercase tracking-wide text-[color:var(--mark-amber)]">{alert.severity} · {alert.source}</p><p className="mt-2 text-sm font-extrabold text-text-primary">{alert.summary}</p></div>
                    <span className="text-xs font-bold text-text-dim">Seen {alert.occurrenceCount} times</span>
                  </div>
                  <p className="mt-3 text-xs font-medium text-text-muted">Delivery {alert.delivery?.status || 'pending'}{alert.delivery?.nextAttemptAt ? ` · next retry ${new Date(alert.delivery.nextAttemptAt).toLocaleString('en-AU')}` : ''}</p>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-14" aria-labelledby="independent-moderation-heading">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <ExclamationTriangleIcon className="h-6 w-6 text-accent" aria-hidden="true" />
                <h2 id="independent-moderation-heading" className="text-3xl font-display font-extrabold text-text-primary">Independent safety review</h2>
              </div>
              <p className="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-text-muted">
                Severe reports and concerns about staff-authored content are kept away from conflicted class owners and reviewed here by administrators.
              </p>
            </div>
            <p className="text-xs font-bold text-text-dim">{highPriorityReports} high priority · {overdueReports} overdue</p>
          </div>

          <div className="mt-5 rounded-2xl bg-[color:var(--block-amber)] p-5 text-sm font-medium leading-relaxed text-text-primary">
            <p className="font-extrabold">{moderation.guidance?.serviceLevel || 'Review new reports within 24 hours.'}</p>
            <p className="mt-2">{moderation.guidance?.emergency || 'If anyone is in immediate danger, contact Triple Zero (000) or a trusted adult now. Do not wait for an in-app review.'}</p>
          </div>

          <div className="mt-5 space-y-4">
            {moderationReports.length ? moderationReports.map((report) => {
              const notificationStatus = report.notification?.status || 'pending';
              const busy = busyKey === `moderation:${report.id}`;
              return (
                <article key={report.id} className={`rounded-3xl border bg-surface-raised p-6 ${report.overdue ? 'border-[color:var(--mark-amber)]' : 'border-line-soft'}`}>
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-accent-soft px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide text-accent">{report.reason}</span>
                        {report.priority === 'high' && <span className="rounded-full bg-surface-error px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide text-text-error">High severity</span>}
                        {report.overdue && <span className="rounded-full bg-[color:var(--block-amber)] px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide text-[color:var(--mark-amber)]">Overdue · 24h SLA</span>}
                        <span className={`rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide ${notificationStatus === 'failed' ? 'bg-surface-error text-text-error' : notificationStatus === 'delivered' ? 'bg-[color:var(--block-green)] text-[color:var(--mark-green)]' : 'bg-surface-soft text-text-muted'}`}>
                          {notificationStatus === 'failed' ? 'Alert retry queued' : notificationStatus === 'delivered' ? 'Alert delivered' : 'Alert queued'}
                        </span>
                      </div>
                      <p className="mt-4 text-xs font-bold text-text-dim">
                        {report.classroom?.name || 'Deleted class'} · reported {report.createdAt ? new Date(report.createdAt).toLocaleString('en-AU') : 'recently'}
                      </p>
                      <p className="mt-4 whitespace-pre-wrap text-sm font-medium leading-relaxed text-text-primary">{report.contentSnapshot}</p>
                      {report.details && <p className="mt-3 text-sm font-medium text-text-muted">Reporter note: {report.details}</p>}
                      <p className="mt-3 text-xs font-medium text-text-dim">
                        Reported by {report.reporter ? `${report.reporter.firstName} ${report.reporter.lastName}` : 'a former member'} · content author {report.commentAuthor ? `${report.commentAuthor.firstName} ${report.commentAuthor.lastName}` : 'unknown'}
                      </p>
                      {notificationStatus === 'failed' && (
                        <p className="mt-3 text-xs font-bold text-text-error">Delivery attempt {report.notification?.attempts || 0} failed and will retry automatically{report.notification?.nextAttemptAt ? ` after ${new Date(report.notification.nextAttemptAt).toLocaleString('en-AU')}` : ''}.</p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 lg:max-w-xs lg:justify-end">
                      <button type="button" disabled={busy || !report.classroomId} onClick={() => reviewModerationReport(report, 'reviewed')} className="btn-secondary px-4 py-2 text-xs">Mark reviewed</button>
                      <button type="button" disabled={busy || !report.classroomId} onClick={() => reviewModerationReport(report, 'dismissed')} className="btn-secondary px-4 py-2 text-xs">Dismiss</button>
                      <button type="button" disabled={busy || !report.classroomId} onClick={() => reviewModerationReport(report, 'actioned')} className="btn-primary px-4 py-2 text-xs">Action taken</button>
                    </div>
                  </div>
                </article>
              );
            }) : <p className="rounded-2xl bg-surface-raised p-6 text-sm font-medium text-text-muted">No independent reports are waiting for review.</p>}
          </div>
        </section>

        <section className="mt-14" aria-labelledby="flags-heading">
          <div className="flex items-center gap-3"><FlagIcon className="h-6 w-6 text-accent" aria-hidden="true" /><h2 id="flags-heading" className="text-3xl font-display font-extrabold text-text-primary">Feature rollouts</h2></div>
          <p className="mt-2 text-sm font-medium text-text-muted">Flags use deterministic cohorts, optimistic version checks, and an append-only audit history. They never replace authorisation.</p>

          <form onSubmit={createFlag} className="mt-6 grid gap-4 rounded-3xl bg-surface-raised p-6 md:grid-cols-[1fr_1.5fr_140px_auto] md:items-end">
            <label className="text-xs font-bold text-text-muted">Flag key<input required pattern="[a-z][a-z0-9._-]+" value={form.key} onChange={(event) => setForm((current) => ({ ...current, key: event.target.value }))} placeholder="learning.new-flow" className="mt-2 w-full rounded-xl border border-line-soft bg-surface-soft px-3 py-2.5 font-mono text-sm text-text-primary outline-none focus:border-accent" /></label>
            <label className="text-xs font-bold text-text-muted">Description<input value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className="mt-2 w-full rounded-xl border border-line-soft bg-surface-soft px-3 py-2.5 text-sm text-text-primary outline-none focus:border-accent" /></label>
            <label className="text-xs font-bold text-text-muted">Initial rollout<input type="number" min="0" max="100" value={form.rolloutPercentage} onChange={(event) => setForm((current) => ({ ...current, rolloutPercentage: event.target.value }))} className="mt-2 w-full rounded-xl border border-line-soft bg-surface-soft px-3 py-2.5 text-sm text-text-primary outline-none focus:border-accent" /></label>
            <button type="submit" disabled={busyKey === 'create'} className="btn-primary"><PlusIcon className="h-4 w-4" aria-hidden="true" /> Create disabled</button>
          </form>

          <div className="mt-5 space-y-3">
            {flags.length ? flags.map((flag) => (
              <article key={flag.key} className="rounded-2xl bg-surface-raised p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-mono text-sm font-bold text-text-primary">{flag.key}</h3><span className="rounded-full bg-surface-soft px-2.5 py-1 text-[10px] font-bold text-text-muted">v{flag.version}</span>{flag.archivedAt && <span className="rounded-full bg-[color:var(--block-amber)] px-2.5 py-1 text-[10px] font-bold text-[color:var(--mark-amber)]">Archived</span>}</div><p className="mt-2 text-xs font-medium text-text-muted">{flag.description || 'No description'} · {flag.rolloutPercentage}% rollout</p></div>
                  <div className="flex flex-wrap gap-2">
                    {!flag.archivedAt && <button type="button" disabled={busyKey === flag.key} onClick={() => mutateFlag(flag, { enabled: !flag.enabled })} className="btn-secondary px-4 py-2 text-xs">{flag.enabled ? 'Disable' : 'Enable'}</button>}
                    {!flag.archivedAt && <button type="button" disabled={busyKey === flag.key} onClick={() => { const value = window.prompt('Rollout percentage (0–100)', String(flag.rolloutPercentage)); if (value !== null) mutateFlag(flag, { rolloutPercentage: Number(value) }); }} className="btn-secondary px-4 py-2 text-xs">Change rollout</button>}
                    <button type="button" disabled={busyKey === flag.key} onClick={() => mutateFlag(flag, null, flag.archivedAt ? 'restore' : 'archive')} className="btn-secondary px-4 py-2 text-xs">{flag.archivedAt ? 'Restore' : 'Archive'}</button>
                  </div>
                </div>
              </article>
            )) : <p className="rounded-2xl bg-surface-raised p-6 text-sm font-medium text-text-muted">No feature flags yet. Core Caplet behaviour is unchanged.</p>}
          </div>
        </section>
      </div>
    </main>
  );
}
