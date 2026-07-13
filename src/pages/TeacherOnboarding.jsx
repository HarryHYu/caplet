import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeftIcon,
  CheckBadgeIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  IdentificationIcon,
} from '@heroicons/react/24/outline';
import CapletLoader from '../components/CapletLoader';
import TeacherAffiliationForm from '../components/teacher/TeacherAffiliationForm';
import api from '../services/api';

const STATUS_COPY = {
  pending: {
    icon: ClockIcon,
    title: 'Verification is in review.',
    detail: 'Your school affiliation has been submitted. You can update it while the review is pending.',
    panel: 'bg-[color:var(--block-amber)]',
  },
  verified: {
    icon: CheckBadgeIcon,
    title: 'Teacher access is verified.',
    detail: 'You can create classes, inspect outcome-level learning, and assign adaptive practice.',
    panel: 'bg-[color:var(--block-green)]',
  },
  rejected: {
    icon: ExclamationTriangleIcon,
    title: 'We need different information.',
    detail: 'Review the note below, update your school affiliation, and submit it again.',
    panel: 'bg-surface-error',
  },
};

export default function TeacherOnboarding() {
  const [state, setState] = useState({ loading: true, error: '', data: null });
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const data = await api.request('/teacher-learning/onboarding/status');
      setState({ loading: false, error: '', data });
      setEditing(data.status === 'not_requested' || data.status === 'rejected');
    } catch (error) {
      setState({ loading: false, error: error.message || 'Could not load teacher verification.', data: null });
    }
  }, []);

  useEffect(() => {
    let active = true;
    api.request('/teacher-learning/onboarding/status').then((data) => {
      if (!active) return;
      setState({ loading: false, error: '', data });
      setEditing(data.status === 'not_requested' || data.status === 'rejected');
    }).catch((error) => {
      if (!active) return;
      setState({ loading: false, error: error.message || 'Could not load teacher verification.', data: null });
    });
    return () => { active = false; };
  }, []);

  const submit = async (affiliation) => {
    setSubmitting(true);
    setNotice('');
    setState((current) => ({ ...current, error: '' }));
    try {
      const isNewOrRejected = state.data?.status === 'not_requested' || state.data?.status === 'rejected';
      const data = await api.request(
        isNewOrRejected ? '/teacher-learning/onboarding/request' : '/teacher-learning/onboarding/affiliation',
        {
          method: isNewOrRejected ? 'POST' : 'PATCH',
          body: JSON.stringify(affiliation),
        },
      );
      setState({
        loading: false,
        error: '',
        data: { ...data, teacherAccess: state.data?.teacherAccess || data.teacherAccess || false },
      });
      setEditing(false);
      setNotice('Your school affiliation has been submitted for review.');
    } catch (error) {
      setState((current) => ({ ...current, error: error.message || 'Could not submit teacher verification.' }));
    } finally {
      setSubmitting(false);
    }
  };

  if (state.loading) {
    return <main className="min-h-screen bg-surface-body pt-24"><div className="grid min-h-[60vh] place-items-center"><CapletLoader message="Checking teacher access…" /></div></main>;
  }

  if (!state.data && state.error) {
    return (
      <main className="min-h-screen bg-surface-body py-28">
        <div className="container-custom max-w-2xl text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-text-error" aria-hidden="true" />
          <h1 className="mt-5 text-3xl font-display font-extrabold text-text-primary">Teacher access could not load.</h1>
          <p role="alert" className="mt-3 text-sm font-medium text-text-error">{state.error}</p>
          <button type="button" onClick={load} className="btn-primary mx-auto mt-6">Try again</button>
        </div>
      </main>
    );
  }

  const status = state.data?.status || 'not_requested';
  const copy = STATUS_COPY[status];
  const StatusIcon = copy?.icon;
  const affiliation = state.data?.profile?.schoolAffiliation;

  return (
    <main className="min-h-screen bg-surface-body py-28 selection:bg-accent selection:text-white">
      <div className="container-custom max-w-5xl">
        <Link to="/classes" className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-accent hover:text-accent-strong">
          <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" /> Back to classes
        </Link>
        <header className="mb-10">
          <span className="font-hand text-xl text-accent -rotate-2 inline-block">trusted teacher tools</span>
          <h1 className="mt-2 text-5xl font-display font-extrabold tracking-tight text-text-primary md:text-7xl">Teacher access.</h1>
          <p className="mt-5 max-w-2xl text-lg font-medium leading-relaxed text-text-muted">
            Verify one school affiliation before accessing class learning evidence and teacher-controlled AI workflows.
          </p>
        </header>

        {state.error && <div role="alert" className="mb-6 rounded-2xl bg-surface-error px-5 py-4 text-sm font-bold text-text-error">{state.error}</div>}
        {notice && <div role="status" aria-live="polite" className="mb-6 rounded-2xl bg-[color:var(--block-green)] px-5 py-4 text-sm font-bold text-text-primary">{notice}</div>}

        {status !== 'not_requested' && copy && !editing && (
          <section className={`mb-8 rounded-3xl p-7 md:p-9 ${copy.panel}`} aria-labelledby="verification-status-heading">
            <StatusIcon className={`h-8 w-8 ${status === 'rejected' ? 'text-text-error' : 'text-accent'}`} aria-hidden="true" />
            <h2 id="verification-status-heading" className="mt-4 text-3xl font-display font-extrabold text-text-primary">{copy.title}</h2>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-text-muted">{copy.detail}</p>
            {state.data?.profile?.verificationNote && (
              <div className="mt-5 rounded-2xl bg-surface-raised/80 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.13em] text-text-dim">Review note</p>
                <p className="mt-2 text-sm font-medium text-text-primary">{state.data.profile.verificationNote}</p>
              </div>
            )}
            {affiliation && (
              <dl className="mt-6 grid gap-4 rounded-2xl bg-surface-raised/80 p-5 sm:grid-cols-2">
                <div><dt className="text-xs font-bold text-text-dim">School</dt><dd className="mt-1 font-bold text-text-primary">{affiliation.name}</dd></div>
                <div><dt className="text-xs font-bold text-text-dim">Staff email</dt><dd className="mt-1 font-bold text-text-primary">{affiliation.staffEmail}</dd></div>
                <div><dt className="text-xs font-bold text-text-dim">Position</dt><dd className="mt-1 font-bold text-text-primary">{affiliation.positionTitle || 'Not provided'}</dd></div>
                <div><dt className="text-xs font-bold text-text-dim">Jurisdiction</dt><dd className="mt-1 font-bold text-text-primary">{affiliation.jurisdiction || 'Not provided'}</dd></div>
              </dl>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={() => setEditing(true)} className="btn-secondary">
                {status === 'verified' ? 'Update school affiliation' : 'Change request'}
              </button>
              {status === 'verified' && <Link to="/classes" className="btn-primary">Open my classes</Link>}
            </div>
          </section>
        )}

        {status === 'not_requested' && !editing && (
          <section className="mb-8 rounded-3xl bg-[color:var(--block-blue)] p-8">
            <IdentificationIcon className="h-8 w-8 text-accent" aria-hidden="true" />
            <h2 className="mt-4 text-3xl font-display font-extrabold text-text-primary">Request teacher verification.</h2>
            <button type="button" onClick={() => setEditing(true)} className="btn-primary mt-6">Add school affiliation</button>
          </section>
        )}

        {editing && (
          <TeacherAffiliationForm
            initialValue={affiliation}
            submitting={submitting}
            onSubmit={submit}
            onCancel={status !== 'not_requested' && status !== 'rejected' ? () => setEditing(false) : null}
          />
        )}

        <aside className="mt-8 rounded-3xl bg-surface-soft p-6">
          <p className="text-sm font-bold text-text-primary">What verification unlocks</p>
          <p className="mt-2 text-sm font-medium leading-relaxed text-text-muted">
            Class mastery maps, misconception patterns, differentiated outcome assignments, and audited human control over AI-marked evidence.
          </p>
        </aside>
      </div>
    </main>
  );
}
