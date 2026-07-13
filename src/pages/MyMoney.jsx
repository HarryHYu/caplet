import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
  ShieldCheckIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import api from '../services/api';
import { FormField } from '../components/AccessibleUI';
import useDialogFocus from '../lib/useDialogFocus';
import {
  MONEY_STORAGE_KEYS,
  calculateSavingsTimeline,
  readMoneyStorage,
  removeMoneyStorage,
  writeMoneyStorage,
} from '../data/moneyPrototype';

const SAMPLE = { label: 'Laptop', target: '2000', current: '350', monthly: '120', extra: '50' };
const EMPTY = { label: '', target: '', current: '', monthly: '', extra: '50' };
const money = (value) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(Number(value) || 0);

function duration(months) {
  if (months === null) return 'Add a regular contribution';
  if (months === 0) return 'Goal already reached in this scenario';
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (!years) return `${months} ${months === 1 ? 'month' : 'months'}`;
  return `${years} ${years === 1 ? 'year' : 'years'}${remainingMonths ? ` ${remainingMonths} ${remainingMonths === 1 ? 'month' : 'months'}` : ''}`;
}

function DeleteScenarioDialog({ busy, onCancel, onConfirm }) {
  const dialogRef = useDialogFocus({ onDismiss: onCancel, dismissDisabled: busy });
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/50 p-4" role="presentation">
      <div ref={dialogRef} role="alertdialog" aria-modal="true" aria-labelledby="delete-scenario-title" aria-describedby="delete-scenario-description" tabIndex="-1" className="w-full max-w-md rounded-3xl bg-surface-raised p-7 shadow-2xl">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-surface-error text-text-error"><TrashIcon className="h-6 w-6" aria-hidden="true" /></span>
        <h2 id="delete-scenario-title" className="mt-5 font-display text-2xl font-extrabold text-text-primary">Delete this saved scenario?</h2>
        <p id="delete-scenario-description" className="mt-3 text-sm font-medium leading-relaxed text-text-muted">The saved goal scenario will be removed. This does not delete the rest of your Caplet account.</p>
        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" data-initial-focus onClick={onCancel} disabled={busy} className="btn-secondary">Cancel</button>
          <button type="button" onClick={onConfirm} disabled={busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-text-error px-5 py-3 text-sm font-bold text-text-contrast disabled:opacity-50"><TrashIcon className="h-4 w-4" aria-hidden="true" />{busy ? 'Deleting…' : 'Delete scenario'}</button>
        </div>
      </div>
    </div>
  );
}

export default function MyMoney() {
  const [inputMode, setInputMode] = useState('sample');
  const [values, setValues] = useState(SAMPLE);
  const [savedScenario, setSavedScenario] = useState(() => readMoneyStorage(MONEY_STORAGE_KEYS.savingsScenario, null));
  const [masked, setMasked] = useState(true);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileAvailable, setProfileAvailable] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    api.getFinancialProfile()
      .then(({ financialProfile }) => { if (active) setProfile(financialProfile || null); })
      .catch(() => { if (active) setProfileAvailable(false); })
      .finally(() => { if (active) setProfileLoading(false); });
    return () => { active = false; };
  }, []);

  const baseTimeline = useMemo(() => calculateSavingsTimeline(values), [values]);
  const comparisonTimeline = useMemo(() => calculateSavingsTimeline({ ...values, monthly: (Number(values.monthly) || 0) + (Number(values.extra) || 0) }), [values]);
  const valid = values.label.trim() && Number(values.target) > 0 && Number(values.current) >= 0 && Number(values.monthly) > 0 && Number(values.target) > Number(values.current);

  const chooseMode = (mode) => {
    setNotice('');
    setInputMode(mode);
    if (mode === 'sample') {
      setValues(SAMPLE);
    } else {
      setValues({ ...EMPTY, current: profile?.savingsBalance == null ? '' : String(profile.savingsBalance) });
    }
  };

  const update = (key, value) => setValues((current) => ({ ...current, [key]: value }));

  const saveScenario = async () => {
    if (!valid) return;
    setSaving(true);
    setNotice('');
    const scenario = {
      ...values,
      target: Number(values.target),
      current: Number(values.current),
      monthly: Number(values.monthly),
      extra: Number(values.extra) || 0,
      inputMode,
      savedAt: new Date().toISOString(),
    };
    writeMoneyStorage(MONEY_STORAGE_KEYS.savingsScenario, scenario);
    setSavedScenario(scenario);

    if (inputMode === 'own') {
      const currentGoals = Array.isArray(profile?.goals) ? profile.goals : [];
      const goals = [...currentGoals.filter((goal) => goal.label !== scenario.label), { label: scenario.label, target: scenario.target }];
      try {
        const response = await api.updateFinancialProfile({ savingsBalance: scenario.current, goals });
        setProfile(response.financialProfile || profile);
        setNotice('The goal and starting amount were saved to your private Caplet profile. Scenario details remain on this device. Teachers and classmates cannot see them.');
      } catch {
        setProfileAvailable(false);
        setNotice('Saved on this device for the prototype. Account sync is currently unavailable.');
      }
    } else {
      setNotice('Sample scenario saved on this device. No personal figures were added to your financial profile.');
    }
    setMasked(true);
    setSaving(false);
  };

  const deleteScenario = async () => {
    setDeleting(true);
    const deletingScenario = savedScenario;
    removeMoneyStorage(MONEY_STORAGE_KEYS.savingsScenario);
    setSavedScenario(null);
    if (deletingScenario?.inputMode === 'own' && profile) {
      try {
        const goals = (profile.goals || []).filter((goal) => goal.label !== deletingScenario.label);
        const response = await api.updateFinancialProfile({ goals });
        setProfile(response.financialProfile || { ...profile, goals });
      } catch {
        setProfileAvailable(false);
      }
    }
    setDeleteOpen(false);
    setDeleting(false);
    setNotice('Saved scenario deleted.');
  };

  return (
    <div className="min-h-screen bg-surface-body pb-32 pt-28 selection:bg-accent selection:text-white md:pt-32 lg:pb-20">
      <div className="container-custom max-w-6xl">
        <Link to="/money" className="inline-flex min-h-11 items-center gap-2 rounded-xl text-sm font-bold text-text-muted hover:text-accent"><ArrowLeftIcon className="h-4 w-4" aria-hidden="true" /> Money overview</Link>

        <header className="mt-6 max-w-4xl">
          <span className="font-hand text-xl text-accent -rotate-2 inline-block">your private space</span>
          <h1 className="mt-3 font-display text-5xl font-extrabold tracking-tight text-text-primary md:text-7xl">My Money.</h1>
          <p className="mt-5 max-w-2xl text-lg font-medium leading-relaxed text-text-muted">Try a savings scenario with sample numbers or deliberately choose to use your own.</p>
        </header>

        <section className="mt-10 rounded-3xl bg-[color:var(--block-blue)] p-7 md:p-9" aria-labelledby="my-money-privacy-title">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-surface-raised text-accent"><ShieldCheckIcon className="h-6 w-6" aria-hidden="true" /></span>
            <div>
              <h2 id="my-money-privacy-title" className="font-display text-2xl font-extrabold tracking-tight text-text-primary">Private to your account.</h2>
              <p className="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-text-muted">Teachers, classmates and classroom features cannot see these figures. Saving is optional. Sample scenarios stay separate from your financial profile, and you can delete a saved scenario at any time.</p>
            </div>
          </div>
        </section>

        {profileLoading && <p role="status" className="mt-5 rounded-2xl bg-surface-soft px-5 py-4 text-sm font-bold text-text-muted">Checking for private profile data…</p>}
        {!profileLoading && !profileAvailable && <p role="alert" className="mt-5 rounded-2xl bg-surface-error px-5 py-4 text-sm font-bold text-text-error">Account sync is unavailable. You can still use sample numbers and keep a prototype scenario on this device.</p>}

        {notice && <div role="status" className="mt-6 flex items-start gap-3 rounded-2xl bg-[color:var(--block-green)] px-5 py-4 text-sm font-bold text-text-primary"><CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--mark-green)]" aria-hidden="true" />{notice}</div>}

        {savedScenario && (
          <section className="mt-6 rounded-3xl bg-surface-raised p-7 shadow-[0_24px_60px_-42px_rgba(20,20,18,0.45)]" aria-labelledby="saved-scenario-title">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <span className="section-kicker">Saved scenario</span>
                <h2 id="saved-scenario-title" className="font-display text-2xl font-extrabold tracking-tight text-text-primary">{savedScenario.label}</h2>
                {masked ? (
                  <p className="mt-2 text-sm font-bold text-text-muted">Figures hidden</p>
                ) : (
                  <p className="mt-2 text-sm font-bold text-text-muted">Target {money(savedScenario.target)} · Starting amount {money(savedScenario.current)} · {money(savedScenario.monthly)} each month</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" aria-pressed={!masked} onClick={() => setMasked((value) => !value)} className="btn-secondary min-h-11">
                  {masked ? <EyeIcon className="h-4 w-4" aria-hidden="true" /> : <EyeSlashIcon className="h-4 w-4" aria-hidden="true" />}
                  {masked ? 'Show figures' : 'Hide figures'}
                </button>
                <button type="button" onClick={() => setDeleteOpen(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-surface-error px-5 py-3 text-sm font-bold text-text-error"><TrashIcon className="h-4 w-4" aria-hidden="true" /> Delete</button>
              </div>
            </div>
          </section>
        )}

        {!savedScenario && !profileLoading && (
          <p className="mt-6 rounded-2xl border border-dashed border-line-soft px-5 py-4 text-sm font-medium text-text-muted">No saved scenario yet. The sample below is ready to try, and nothing is saved until you choose Save.</p>
        )}

        <section className="mt-8" aria-labelledby="number-choice-title">
          <span className="section-kicker">Choose your data</span>
          <h2 id="number-choice-title" className="font-display text-3xl font-extrabold tracking-tight text-text-primary">Start safely with an example.</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <button type="button" aria-pressed={inputMode === 'sample'} onClick={() => chooseMode('sample')} className={`min-h-32 rounded-3xl p-6 text-left ${inputMode === 'sample' ? 'bg-accent text-white' : 'bg-surface-raised text-text-primary shadow-[0_20px_46px_-38px_rgba(20,20,18,0.4)]'}`}>
              <span className="block font-display text-xl font-extrabold">Use sample numbers</span>
              <span className={`mt-2 block text-sm font-medium ${inputMode === 'sample' ? 'text-white/80' : 'text-text-muted'}`}>Recommended for trying the prototype. Nothing is added to your financial profile.</span>
            </button>
            <button type="button" aria-pressed={inputMode === 'own'} onClick={() => chooseMode('own')} className={`min-h-32 rounded-3xl p-6 text-left ${inputMode === 'own' ? 'bg-accent text-white' : 'bg-surface-raised text-text-primary shadow-[0_20px_46px_-38px_rgba(20,20,18,0.4)]'}`}>
              <span className="block font-display text-xl font-extrabold">Use my own numbers</span>
              <span className={`mt-2 block text-sm font-medium ${inputMode === 'own' ? 'text-white/80' : 'text-text-muted'}`}>Only saved after you press Save. Existing savings can be loaded from your private profile.</span>
            </button>
          </div>
          {!profileAvailable && inputMode === 'own' && <p role="alert" className="mt-3 text-sm font-bold text-text-error">Your account profile is unavailable. You can still try and save this prototype on this device.</p>}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-12" aria-labelledby="savings-scenario-title">
          <div className="rounded-3xl bg-surface-raised p-7 shadow-[0_24px_60px_-42px_rgba(20,20,18,0.45)] lg:col-span-7 md:p-10">
            <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-accent-soft text-accent"><LockClosedIcon className="h-5 w-5" aria-hidden="true" /></span><p className="text-xs font-bold uppercase tracking-[0.12em] text-text-muted">{inputMode === 'sample' ? 'Sample scenario' : 'Your optional figures'}</p></div>
            <h2 id="savings-scenario-title" className="mt-5 font-display text-3xl font-extrabold tracking-tight text-text-primary">Compare a savings timeline.</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              <FormField id="money-goal-label" label="Goal name" hint="For example, laptop or trip">
                {(props) => <input {...props} value={values.label} maxLength="80" onChange={(event) => update('label', event.target.value)} className="w-full rounded-2xl border border-line-soft bg-surface-soft px-4 py-3 text-text-primary outline-none focus:border-accent" />}
              </FormField>
              <FormField id="money-goal-target" label="Target (AUD)">
                {(props) => <input {...props} type="number" min="1" step="1" value={values.target} onChange={(event) => update('target', event.target.value)} className="w-full rounded-2xl border border-line-soft bg-surface-soft px-4 py-3 text-text-primary outline-none focus:border-accent" />}
              </FormField>
              <FormField id="money-goal-current" label="Starting amount (AUD)">
                {(props) => <input {...props} type="number" min="0" step="1" value={values.current} onChange={(event) => update('current', event.target.value)} className="w-full rounded-2xl border border-line-soft bg-surface-soft px-4 py-3 text-text-primary outline-none focus:border-accent" />}
              </FormField>
              <FormField id="money-goal-monthly" label="Regular monthly contribution (AUD)">
                {(props) => <input {...props} type="number" min="1" step="1" value={values.monthly} onChange={(event) => update('monthly', event.target.value)} className="w-full rounded-2xl border border-line-soft bg-surface-soft px-4 py-3 text-text-primary outline-none focus:border-accent" />}
              </FormField>
              <FormField id="money-goal-extra" label="Compare with this much extra each month (AUD)" hint="This changes the comparison only">
                {(props) => <input {...props} type="number" min="0" step="1" value={values.extra} onChange={(event) => update('extra', event.target.value)} className="w-full rounded-2xl border border-line-soft bg-surface-soft px-4 py-3 text-text-primary outline-none focus:border-accent" />}
              </FormField>
            </div>
            {!valid && <p className="mt-5 text-sm font-medium text-text-muted">Enter a target above the starting amount and a regular contribution to calculate a timeline.</p>}
            <button type="button" onClick={saveScenario} disabled={!valid || saving} className="btn-primary mt-7 min-h-12 disabled:opacity-50">{saving ? 'Saving…' : inputMode === 'sample' ? 'Save sample scenario' : 'Save privately'}</button>
          </div>

          <div className="rounded-3xl bg-[color:var(--block-blue)] p-7 lg:col-span-5 md:p-10" aria-live="polite">
            <span className="section-kicker">Comparison</span>
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl bg-surface-raised p-5">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-text-dim">At {money(values.monthly)} each month</p>
                <p className="mt-2 font-display text-3xl font-extrabold tracking-tight text-text-primary">{valid ? duration(baseTimeline.months) : '—'}</p>
              </div>
              <div className="rounded-2xl bg-surface-raised p-5">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-text-dim">At {money((Number(values.monthly) || 0) + (Number(values.extra) || 0))} each month</p>
                <p className="mt-2 font-display text-3xl font-extrabold tracking-tight text-text-primary">{valid ? duration(comparisonTimeline.months) : '—'}</p>
              </div>
            </div>
            <p className="mt-5 text-xs font-medium leading-relaxed text-text-muted">Contribution-only estimate. Interest, fees and changing circumstances are not included. Neither option is presented as the correct choice.</p>
          </div>
        </section>
      </div>
      {deleteOpen && <DeleteScenarioDialog busy={deleting} onCancel={() => setDeleteOpen(false)} onConfirm={deleteScenario} />}
    </div>
  );
}
