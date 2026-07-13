import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircleIcon, ExclamationTriangleIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import CapletLoader from '../components/CapletLoader';
import api from '../services/api';

export default function GuardianConsent() {
  const { token } = useParams();
  const [request, setRequest] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [affirmed, setAffirmed] = useState(false);
  const [busy, setBusy] = useState('');
  const [decision, setDecision] = useState('');
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    let active = true;
    api.request(`/privacy/guardian-consent/${encodeURIComponent(token || '')}`)
      .then((data) => { if (active) setRequest(data.request); })
      .catch((error) => { if (active) setLoadError(error.message || 'This consent request is unavailable.'); });
    return () => { active = false; };
  }, [token]);

  const respond = async (nextDecision) => {
    setBusy(nextDecision);
    setSubmitError('');
    try {
      const data = await api.request(`/privacy/guardian-consent/${encodeURIComponent(token || '')}`, {
        method: 'POST',
        body: JSON.stringify({ decision: nextDecision, guardianName, guardianAffirmation: affirmed }),
      });
      setDecision(data.status);
    } catch (error) {
      setSubmitError(error.message || 'Could not record your decision.');
    } finally {
      setBusy('');
    }
  };

  const terminalStatus = decision || (request?.status !== 'pending' ? request?.status : '');

  return (
    <main className="min-h-screen bg-surface-soft px-5 py-12">
      <div className="mx-auto w-full max-w-xl">
        <Link to="/" className="font-display text-xl font-extrabold text-text-primary">Caplet.</Link>
        <section className="mt-8 rounded-3xl bg-surface-raised p-7 shadow-sm md:p-10" aria-labelledby="guardian-consent-title">
          {!request && !loadError ? (
            <div className="grid min-h-64 place-items-center" role="status"><CapletLoader message="Checking this consent request…" /></div>
          ) : loadError ? (
            <div className="text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-surface-error text-text-error"><ExclamationTriangleIcon className="h-7 w-7" aria-hidden="true" /></span>
              <h1 id="guardian-consent-title" className="mt-5 text-2xl font-display font-extrabold text-text-primary">Consent request unavailable</h1>
              <p role="alert" className="mt-2 text-sm font-medium text-text-muted">{loadError}</p>
            </div>
          ) : terminalStatus ? (
            <div className="text-center">
              <span className={`mx-auto grid h-14 w-14 place-items-center rounded-2xl ${terminalStatus === 'granted' ? 'bg-[color:var(--block-green)] text-[color:var(--mark-green)]' : 'bg-surface-soft text-text-muted'}`}>
                {terminalStatus === 'granted' ? <CheckCircleIcon className="h-7 w-7" aria-hidden="true" /> : <ShieldCheckIcon className="h-7 w-7" aria-hidden="true" />}
              </span>
              <h1 id="guardian-consent-title" className="mt-5 text-2xl font-display font-extrabold text-text-primary">
                {terminalStatus === 'granted' ? 'Consent recorded' : terminalStatus === 'declined' ? 'Decision recorded' : 'This request is no longer active'}
              </h1>
              <p className="mt-2 text-sm font-medium leading-relaxed text-text-muted">
                {terminalStatus === 'granted' ? 'The learner may now choose whether to enable optional AI, analytics, and classroom participation.' : terminalStatus === 'declined' ? 'Optional AI, analytics, and classroom participation will remain unavailable for this learner.' : 'Ask the learner to create a new guardian consent request from their privacy settings.'}
              </p>
            </div>
          ) : (
            <>
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-accent-soft text-accent"><ShieldCheckIcon className="h-7 w-7" aria-hidden="true" /></span>
              <p className="mt-6 text-xs font-bold uppercase tracking-[0.14em] text-accent">Parent or guardian decision</p>
              <h1 id="guardian-consent-title" className="mt-2 text-3xl font-display font-extrabold text-text-primary">Review optional learning features</h1>
              <p className="mt-3 text-sm font-medium leading-relaxed text-text-muted">This decision covers the age safeguard for optional AI feedback, product analytics, and joining teacher-managed classrooms. The learner must still choose each feature separately. Core courses and non-AI practice remain available if you decline.</p>

              <div className="mt-6 rounded-2xl bg-surface-soft p-5 text-sm font-medium leading-relaxed text-text-muted">
                <p><strong className="text-text-primary">What may be processed:</strong> submitted answers, questions, and generated feedback.</p>
                <p className="mt-2"><strong className="text-text-primary">Classrooms:</strong> teachers can see the learner’s display name, assignments, and mastery evidence. Classmates do not receive their email or private mastery map.</p>
                <p className="mt-2"><strong className="text-text-primary">Analytics:</strong> opted-in, de-identified usage events help Caplet measure learning journeys.</p>
                <p className="mt-2"><strong className="text-text-primary">Control:</strong> the learner can withdraw AI consent and clear stored AI-history summaries at any time.</p>
                <p className="mt-2"><strong className="text-text-primary">Expiry:</strong> this request expires {new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium' }).format(new Date(request.expiresAt))}.</p>
              </div>

              <label htmlFor="guardian-name" className="mt-6 block text-sm font-bold text-text-primary">Your full name</label>
              <input id="guardian-name" autoComplete="name" value={guardianName} onChange={(event) => setGuardianName(event.target.value)} className="mt-2 w-full rounded-2xl border border-line-soft bg-surface-raised px-4 py-3 text-sm font-medium text-text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft" />
              <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl bg-surface-soft p-4 text-sm font-medium leading-relaxed text-text-primary">
                <input type="checkbox" checked={affirmed} onChange={(event) => setAffirmed(event.target.checked)} className="mt-1 h-4 w-4 rounded border-line-strong text-accent focus:ring-accent" />
                <span>I confirm that I am this learner’s parent or legal guardian and am authorised to make this decision.</span>
              </label>
              {submitError && <p role="alert" className="mt-4 text-sm font-bold text-text-error">{submitError}</p>}
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                <button type="button" disabled={Boolean(busy) || guardianName.trim().length < 2 || !affirmed} onClick={() => respond('granted')} className="btn-primary">{busy === 'granted' ? 'Recording…' : 'Approve safeguards'}</button>
                <button type="button" disabled={Boolean(busy) || guardianName.trim().length < 2 || !affirmed} onClick={() => respond('declined')} className="btn-secondary">{busy === 'declined' ? 'Recording…' : 'Decline'}</button>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
