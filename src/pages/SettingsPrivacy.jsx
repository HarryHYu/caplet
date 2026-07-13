import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ClipboardDocumentIcon,
  ClockIcon,
  CpuChipIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  EnvelopeIcon,
  InformationCircleIcon,
  ServerStackIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import CapletLoader from '../components/CapletLoader';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const POLICY_VERSION = 'privacy-controls-v2';
const DELETE_CONFIRMATION = 'DELETE MY ACCOUNT';

const CONSENT_OPTIONS = [
  {
    type: 'ai_processing',
    title: 'AI-assisted learning',
    description: 'Allow Caplet to send the learning text you submit to configured AI services for optional feedback and tutoring.',
  },
  {
    type: 'learning_analytics',
    title: 'Personal learning analytics',
    description: 'Allow optional learning-analytics insights that help Caplet improve recommendations and understand how learning features are used. Core evidence needed to provide your mastery map is managed separately.',
  },
  {
    type: 'classroom_data',
    title: 'Classroom participation',
    description: 'Allow your display name and learning activity to be shared with teachers in classes you choose to join. Classmates do not receive your email or private mastery evidence.',
  },
];

const RETENTION_OPTIONS = [
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
  { value: 180, label: '180 days' },
  { value: 365, label: '1 year' },
  { value: 730, label: '2 years' },
];

function latestConsent(consents, type) {
  return consents.find((consent) => consent.type === type) || null;
}

function formatDate(value, includeTime = false) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(includeTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  }).format(date);
}

function humanise(value) {
  if (!value) return 'Unknown';
  return String(value).replaceAll('_', ' ').replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function StatusNotice({ notice, onDismiss }) {
  if (!notice?.text) return null;
  const isError = notice.type === 'error';
  return (
    <div
      role={isError ? 'alert' : 'status'}
      className={`mb-8 flex items-start gap-3 rounded-2xl px-5 py-4 text-sm font-bold ${isError ? 'bg-surface-error text-text-error' : 'bg-[color:var(--block-green)] text-text-primary'}`}
    >
      {isError ? <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" /> : <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--mark-green)]" aria-hidden="true" />}
      <span className="min-w-0 flex-1">{notice.text}</span>
      <button type="button" onClick={onDismiss} className="shrink-0 rounded-lg p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" aria-label="Dismiss message">
        <XMarkIcon className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

function Switch({ id, label, description, checked, disabled, onChange }) {
  return (
    <div className="flex items-start justify-between gap-5 rounded-2xl bg-surface-soft p-5">
      <div>
        <p id={`${id}-label`} className="text-sm font-bold text-text-primary">{label}</p>
        <p id={`${id}-description`} className="mt-1 max-w-xl text-xs font-medium leading-relaxed text-text-muted">{description}</p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-description`}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-raised disabled:cursor-wait disabled:opacity-55 ${checked ? 'bg-accent' : 'bg-line-soft'}`}
      >
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-surface-raised shadow-sm transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );
}

function ConfirmationDialog({ title, description, confirmLabel, busy, confirmDisabled = false, danger = false, onCancel, onConfirm, children }) {
  const dialogRef = useRef(null);
  const cancelRef = useRef(onCancel);
  const busyRef = useRef(busy);
  const previouslyFocusedRef = useRef(document.activeElement);
  const titleId = useId();
  const descriptionId = useId();
  cancelRef.current = onCancel;
  busyRef.current = busy;

  useEffect(() => {
    const previouslyFocused = previouslyFocusedRef.current;
    const dialog = dialogRef.current;
    const focusableSelector = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';
    const focusableElements = () => [...(dialog?.querySelectorAll(focusableSelector) || [])];
    const initialFocus = dialog?.querySelector('[autofocus]') || focusableElements()[0];
    initialFocus?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !busyRef.current) {
        event.preventDefault();
        cancelRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const elements = focusableElements();
      if (!elements.length) {
        event.preventDefault();
        return;
      }
      const first = elements[0];
      const last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-surface-inverse/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onCancel(); }}>
      <section ref={dialogRef} role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} className="w-full max-w-lg rounded-3xl bg-surface-raised p-7 shadow-2xl md:p-8">
        <span className={`grid h-12 w-12 place-items-center rounded-2xl ${danger ? 'bg-surface-error text-text-error' : 'bg-[color:var(--block-amber)] text-[color:var(--mark-amber)]'}`}>
          <ExclamationTriangleIcon className="h-6 w-6" aria-hidden="true" />
        </span>
        <h2 id={titleId} className="mt-5 text-2xl font-display font-extrabold text-text-primary">{title}</h2>
        <p id={descriptionId} className="mt-2 text-sm font-medium leading-relaxed text-text-muted">{description}</p>
        {children}
        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" autoFocus={!children} onClick={onCancel} disabled={busy} className="btn-secondary">Cancel</button>
          <button type="button" onClick={onConfirm} disabled={busy || confirmDisabled} className={danger ? 'inline-flex items-center justify-center gap-2 rounded-2xl bg-text-error px-6 py-3 text-sm font-bold text-text-contrast transition-opacity disabled:cursor-not-allowed disabled:opacity-40' : 'btn-primary'}>
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

function SectionHeading({ icon, eyebrow, title, description, action }) {
  const Icon = icon;
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent"><Icon className="h-5 w-5" aria-hidden="true" /></span>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-text-dim">{eyebrow}</p>
          <h3 className="mt-1 text-xl font-display font-extrabold text-text-primary">{title}</h3>
          {description && <p className="mt-1 max-w-2xl text-sm font-medium leading-relaxed text-text-muted">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

function PreferenceControls({ preference, consents, savingKey, ageVerificationRequired, onPreferenceChange, onConsentChange, onAcknowledgeAge, onGuardianRequest }) {
  const [guardianEmail, setGuardianEmail] = useState('');
  const [guardianShareUrl, setGuardianShareUrl] = useState('');
  const [guardianBusy, setGuardianBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const requestGuardianConsent = async (event) => {
    event.preventDefault();
    setGuardianBusy(true);
    try {
      const result = await onGuardianRequest(guardianEmail);
      if (result?.shareUrl) setGuardianShareUrl(result.shareUrl);
    } finally {
      setGuardianBusy(false);
    }
  };

  const copyGuardianLink = async () => {
    await navigator.clipboard?.writeText(guardianShareUrl);
    setCopied(true);
  };

  return (
    <section className="border-b border-line-soft pb-10" aria-labelledby="privacy-preferences-heading">
      <SectionHeading icon={ShieldCheckIcon} eyebrow="Your choices" title="Privacy preferences" description="Change how Caplet stores optional activity and uses it to personalise your learning." />
      <h4 id="privacy-preferences-heading" className="sr-only">Privacy preferences</h4>

      <div className="space-y-3">
        <Switch
          id="ai-history-enabled"
          label="Keep my AI activity history"
          description="Store a readable history of optional AI interactions so you can inspect and delete them below. Turning this off applies to new interactions."
          checked={Boolean(preference.aiHistoryEnabled)}
          disabled={savingKey === 'aiHistoryEnabled'}
          onChange={(value) => onPreferenceChange('aiHistoryEnabled', value)}
        />
      </div>

      <div className="mt-4 rounded-2xl bg-surface-soft p-5">
        <label htmlFor="ai-retention-days" className="block text-sm font-bold text-text-primary">AI history retention</label>
        <p id="ai-retention-description" className="mt-1 text-xs font-medium leading-relaxed text-text-muted">Choose how long stored AI interaction summaries remain available.</p>
        <div className="relative mt-3 max-w-xs">
          <select
            id="ai-retention-days"
            aria-describedby="ai-retention-description"
            value={preference.aiRetentionDays || 365}
            disabled={savingKey === 'aiRetentionDays' || !preference.aiHistoryEnabled}
            onChange={(event) => onPreferenceChange('aiRetentionDays', Number(event.target.value))}
            className="w-full appearance-none rounded-2xl border border-line-soft bg-surface-raised px-4 py-3 pr-10 text-sm font-bold text-text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft disabled:cursor-not-allowed disabled:opacity-50"
          >
            {RETENTION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <ChevronDownIcon className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-text-muted" aria-hidden="true" />
        </div>
      </div>

      <div className="mt-7">
        <h4 className="text-sm font-display font-extrabold text-text-primary">Consent choices</h4>
        <p className="mt-1 text-xs font-medium text-text-muted">You can withdraw optional consent at any time. Withdrawal is recorded in your consent history.</p>
        {ageVerificationRequired && (
          <div className="mt-3 rounded-2xl bg-[color:var(--block-amber)] p-4 text-xs font-medium leading-relaxed text-text-primary">
            Add your date of birth before enabling optional AI so Caplet can apply the right age-appropriate safeguards. It is never shown publicly.
            <Link to="/settings/profile" className="ml-2 font-bold text-accent underline underline-offset-2">Open profile settings</Link>
          </div>
        )}
        <div className="mt-3 space-y-3">
          {CONSENT_OPTIONS.map((option) => {
            const consent = latestConsent(consents, option.type);
            const granted = consent?.status === 'granted';
            const ageSensitive = ['ai_processing', 'learning_analytics', 'classroom_data'].includes(option.type);
            return (
              <Switch
                key={option.type}
                id={`consent-${option.type}`}
                label={option.title}
                description={`${option.description}${consent ? ` Last changed ${formatDate(consent.grantedAt || consent.withdrawnAt)}.` : ''}`}
                checked={granted}
                disabled={savingKey === `consent:${option.type}` || (ageSensitive && ageVerificationRequired)}
                onChange={(value) => onConsentChange(option.type, value)}
              />
            );
          })}
        </div>
      </div>

      <div className="mt-7 rounded-2xl bg-[color:var(--block-blue)] p-5">
        <div className="flex items-start gap-3">
          <InformationCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
          <div>
            <h4 className="text-sm font-bold text-text-primary">Age-appropriate privacy notice</h4>
            <p className="mt-1 text-xs font-medium leading-relaxed text-text-muted">Caplet stores account and learning data to provide your courses, practice, feedback, and classes. Optional AI and analytics choices can be changed here.</p>
            {preference.ageNoticeAcknowledgedAt ? (
              <p className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-accent"><CheckCircleIcon className="h-4 w-4" aria-hidden="true" /> Acknowledged {formatDate(preference.ageNoticeAcknowledgedAt)}</p>
            ) : (
              <button type="button" onClick={onAcknowledgeAge} disabled={savingKey === 'ageNoticeAcknowledged'} className="btn-secondary mt-4">
                {savingKey === 'ageNoticeAcknowledged' ? 'Saving…' : 'I understand'}
              </button>
            )}
            {preference.parentConsentStatus && preference.parentConsentStatus !== 'not_required' && (
              <p className="mt-3 text-xs font-bold text-text-primary">Parent or guardian consent: {humanise(preference.parentConsentStatus)}</p>
            )}
            {['pending', 'declined'].includes(preference.parentConsentStatus) && (
              <form className="mt-4 rounded-2xl bg-surface-raised p-4" onSubmit={requestGuardianConsent}>
                <label htmlFor="guardian-email" className="text-xs font-bold text-text-primary">Parent or guardian email</label>
                <p className="mt-1 text-xs font-medium leading-relaxed text-text-muted">Caplet will email a private, single-use approval link to your parent or legal guardian. It expires after 7 days.</p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input id="guardian-email" type="email" required autoComplete="email" value={guardianEmail} onChange={(event) => setGuardianEmail(event.target.value)} placeholder="guardian@example.com" className="min-w-0 flex-1 rounded-2xl border border-line-soft bg-surface-soft px-4 py-3 text-sm font-medium text-text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft" />
                  <button type="submit" disabled={guardianBusy} className="btn-primary shrink-0"><EnvelopeIcon className="h-4 w-4" aria-hidden="true" />{guardianBusy ? 'Sending…' : 'Send request'}</button>
                </div>
                {guardianShareUrl && (
                  <div role="status" className="mt-4 rounded-xl bg-[color:var(--block-green)] p-4">
                    <label htmlFor="guardian-share-link" className="text-xs font-bold text-text-primary">Guardian approval link</label>
                    <input id="guardian-share-link" readOnly value={guardianShareUrl} className="mt-2 w-full rounded-xl border border-line-soft bg-surface-raised px-3 py-2 font-mono text-xs text-text-primary" />
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={copyGuardianLink} className="btn-secondary py-2 text-xs"><ClipboardDocumentIcon className="h-4 w-4" aria-hidden="true" />{copied ? 'Copied' : 'Copy link'}</button>
                      <a className="btn-secondary py-2 text-xs" href={`mailto:${encodeURIComponent(guardianEmail)}?subject=${encodeURIComponent('Caplet guardian consent request')}&body=${encodeURIComponent(`Please review this Caplet consent request: ${guardianShareUrl}`)}`}><EnvelopeIcon className="h-4 w-4" aria-hidden="true" />Open email</a>
                    </div>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function AIHistory({ interactions, clearing, onRequestClear }) {
  return (
    <section className="border-b border-line-soft py-10" aria-labelledby="ai-history-heading">
      <SectionHeading
        icon={SparklesIcon}
        eyebrow="Transparency"
        title="AI activity history"
        description="See which Caplet features used AI, when they ran, and the summaries retained for your account."
        action={interactions.length > 0 ? (
          <button type="button" onClick={onRequestClear} disabled={clearing} className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-surface-error px-4 py-2.5 text-xs font-bold text-text-error transition-transform hover:-translate-y-0.5 disabled:opacity-50">
            <TrashIcon className="h-4 w-4" aria-hidden="true" /> Clear history
          </button>
        ) : null}
      />
      <h4 id="ai-history-heading" className="sr-only">AI activity history entries</h4>

      {interactions.length ? (
        <ol className="space-y-4">
          {interactions.map((interaction) => (
            <li key={interaction.id} className="rounded-2xl bg-surface-soft p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-base font-display font-extrabold text-text-primary">{humanise(interaction.feature)}</h4>
                    <span className="rounded-full bg-surface-raised px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-text-muted">{humanise(interaction.status)}</span>
                  </div>
                  <p className="mt-1 text-xs font-medium text-text-muted">
                    <time dateTime={interaction.occurredAt}>{formatDate(interaction.occurredAt, true)}</time>
                    {interaction.modelVersion ? ` · ${interaction.modelVersion}` : ''}
                    {interaction.confidence ? ` · ${humanise(interaction.confidence)} confidence` : ''}
                  </p>
                </div>
                {interaction.expiresAt && <span className="inline-flex shrink-0 items-center gap-1.5 text-[11px] font-bold text-text-dim"><ClockIcon className="h-3.5 w-3.5" aria-hidden="true" /> Deletes {formatDate(interaction.expiresAt)}</span>}
              </div>
              {(interaction.inputSummary || interaction.outputSummary) && (
                <dl className="mt-4 grid gap-3 md:grid-cols-2">
                  {interaction.inputSummary && <div className="rounded-xl bg-surface-raised p-4"><dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-dim">What you submitted</dt><dd className="mt-1.5 text-sm font-medium leading-relaxed text-text-primary">{interaction.inputSummary}</dd></div>}
                  {interaction.outputSummary && <div className="rounded-xl bg-surface-raised p-4"><dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-dim">What Caplet returned</dt><dd className="mt-1.5 text-sm font-medium leading-relaxed text-text-primary">{interaction.outputSummary}</dd></div>}
                </dl>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <div className="rounded-2xl bg-surface-soft p-7 text-center">
          <EyeIcon className="mx-auto h-7 w-7 text-text-dim" aria-hidden="true" />
          <h4 className="mt-3 text-lg font-display font-extrabold text-text-primary">No stored AI activity</h4>
          <p className="mx-auto mt-1 max-w-lg text-sm font-medium text-text-muted">AI interactions will appear here only when history is enabled and an AI-assisted feature is used.</p>
        </div>
      )}
    </section>
  );
}

function Processors({ processors, note }) {
  return (
    <section className="border-b border-line-soft py-10" aria-labelledby="processors-heading">
      <SectionHeading icon={ServerStackIcon} eyebrow="Who handles data" title="Service providers" description="These providers may process data when the corresponding Caplet feature or hosting service is used." />
      <h4 id="processors-heading" className="sr-only">Service providers and data processors</h4>
      {processors.length ? (
        <ul className="grid gap-3 md:grid-cols-2">
          {processors.map((processor) => (
            <li key={processor.name} className="rounded-2xl bg-surface-soft p-5">
              <div className="flex items-start justify-between gap-3">
                <h4 className="text-base font-display font-extrabold text-text-primary">{processor.name}</h4>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${processor.optional ? 'bg-accent-soft text-accent' : 'bg-surface-raised text-text-muted'}`}>{processor.optional ? 'Optional' : 'Required'}</span>
              </div>
              <p className="mt-2 text-sm font-medium leading-relaxed text-text-muted">{processor.purpose}</p>
              {processor.categories?.length > 0 && <p className="mt-3 text-xs font-semibold text-text-primary">Data: {processor.categories.join(', ')}</p>}
            </li>
          ))}
        </ul>
      ) : <p className="rounded-2xl bg-surface-soft p-5 text-sm font-medium text-text-muted">No processor disclosures are available.</p>}
      {note && <p className="mt-4 flex items-start gap-2 text-xs font-medium leading-relaxed text-text-dim"><InformationCircleIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {note}</p>}
    </section>
  );
}

function DataActions({ exporting, deleting, deleteConfirmation, setDeleteConfirmation, onExport, onRequestDelete, onCancelDelete, onDelete }) {
  return (
    <section className="pt-10" aria-labelledby="data-actions-heading">
      <SectionHeading icon={CpuChipIcon} eyebrow="Your account" title="Export or delete your data" description="Download a machine-readable copy of your Caplet data, or permanently delete your account." />
      <h4 id="data-actions-heading" className="sr-only">Account data actions</h4>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-[color:var(--block-blue)] p-6">
          <ArrowDownTrayIcon className="h-6 w-6 text-accent" aria-hidden="true" />
          <h4 className="mt-4 text-lg font-display font-extrabold text-text-primary">Download my data</h4>
          <p className="mt-2 text-sm font-medium leading-relaxed text-text-muted">Receive account, learning, class, consent, AI, and connected financial data as a JSON file.</p>
          <button type="button" onClick={onExport} disabled={exporting} className="btn-primary mt-5">
            {exporting ? <ArrowPathIcon className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ArrowDownTrayIcon className="h-4 w-4" aria-hidden="true" />}
            {exporting ? 'Preparing export…' : 'Download export'}
          </button>
        </div>
        <div className="rounded-2xl bg-surface-error p-6">
          <TrashIcon className="h-6 w-6 text-text-error" aria-hidden="true" />
          <h4 className="mt-4 text-lg font-display font-extrabold text-text-primary">Delete my account</h4>
          <p className="mt-2 text-sm font-medium leading-relaxed text-text-muted">Permanently removes your account and associated Caplet data. This cannot be undone.</p>
          <button type="button" onClick={onRequestDelete} className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-text-error px-5 py-3 text-sm font-bold text-text-contrast">
            <TrashIcon className="h-4 w-4" aria-hidden="true" /> Delete account
          </button>
        </div>
      </div>

      {deleteConfirmation !== null && (
        <ConfirmationDialog
          title="Permanently delete your account?"
          description={`Type ${DELETE_CONFIRMATION} exactly. Your courses, progress, practice evidence, consent history, AI history, classes, essays, and financial profile will be deleted.`}
          confirmLabel="Delete permanently"
          danger
          busy={deleting}
          confirmDisabled={deleteConfirmation !== DELETE_CONFIRMATION}
          onCancel={onCancelDelete}
          onConfirm={onDelete}
        >
          <div className="mt-5">
            <label htmlFor="account-delete-confirmation" className="block text-xs font-bold uppercase tracking-[0.12em] text-text-muted">Confirmation phrase</label>
            <input
              id="account-delete-confirmation"
              autoFocus
              autoComplete="off"
              spellCheck="false"
              value={deleteConfirmation}
              onChange={(event) => setDeleteConfirmation(event.target.value)}
              disabled={deleting}
              className="mt-2 w-full rounded-2xl border border-line-soft bg-surface-soft px-4 py-3 font-mono text-sm text-text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
            />
            <p className="mt-2 text-xs font-medium text-text-error">This action is irreversible.</p>
          </div>
        </ConfirmationDialog>
      )}
    </section>
  );
}

export default function SettingsPrivacy() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [preference, setPreference] = useState(null);
  const [consents, setConsents] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [processorsData, setProcessorsData] = useState({ processors: [], note: '' });
  const [savingKey, setSavingKey] = useState('');
  const [notice, setNotice] = useState(null);
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);
  const [clearingHistory, setClearingHistory] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [ageVerificationRequired, setAgeVerificationRequired] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [preferencesData, historyData, processorData] = await Promise.all([
        api.request('/privacy/preferences'),
        api.request('/privacy/ai-history?limit=100'),
        api.request('/privacy/processors'),
      ]);
      setPreference(preferencesData.preference);
      setAgeVerificationRequired(Boolean(preferencesData.ageVerificationRequired));
      setConsents(preferencesData.consents || []);
      setInteractions(historyData.interactions || []);
      setProcessorsData({ processors: processorData.processors || [], note: processorData.note || '' });
    } catch (error) {
      setLoadError(error.message || 'Could not load your privacy controls.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updatePreference = async (key, value, payload = { [key]: value }) => {
    setSavingKey(key);
    setNotice(null);
    try {
      const data = await api.request('/privacy/preferences', { method: 'PUT', body: JSON.stringify(payload) });
      setPreference(data.preference);
      setNotice({ type: 'success', text: 'Your privacy preference was updated.' });
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'Could not update that preference.' });
    } finally {
      setSavingKey('');
    }
  };

  const updateConsent = async (type, granted) => {
    setSavingKey(`consent:${type}`);
    setNotice(null);
    try {
      const data = granted
        ? await api.request('/privacy/consents', { method: 'POST', body: JSON.stringify({ type, policyVersion: POLICY_VERSION }) })
        : await api.request(`/privacy/consents/${encodeURIComponent(type)}`, { method: 'DELETE' });
      setConsents((current) => [data.consent, ...current]);
      setNotice({ type: 'success', text: `${humanise(type)} consent was ${granted ? 'granted' : 'withdrawn'}.` });
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'Could not update that consent choice.' });
    } finally {
      setSavingKey('');
    }
  };

  const requestGuardianConsent = async (guardianEmail) => {
    setNotice(null);
    try {
      const data = await api.request('/privacy/guardian-consent-requests', {
        method: 'POST',
        body: JSON.stringify({ guardianEmail, policyVersion: POLICY_VERSION }),
      });
      setPreference((current) => ({ ...current, parentConsentStatus: 'pending' }));
      setNotice({
        type: 'success',
        text: data.delivery === 'email'
          ? 'Guardian approval request sent by email.'
          : 'Development approval link created. Production sends this link directly by email.',
      });
      return data;
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'Could not create a guardian consent request.' });
      return null;
    }
  };

  const clearHistory = async () => {
    setClearingHistory(true);
    setNotice(null);
    try {
      const data = await api.request('/privacy/ai-history', { method: 'DELETE' });
      setInteractions([]);
      setConfirmClearHistory(false);
      setNotice({ type: 'success', text: `${Number(data?.deleted) || 0} AI ${Number(data?.deleted) === 1 ? 'interaction was' : 'interactions were'} deleted.` });
    } catch (error) {
      setConfirmClearHistory(false);
      setNotice({ type: 'error', text: error.message || 'Could not clear AI history.' });
    } finally {
      setClearingHistory(false);
    }
  };

  const exportData = async () => {
    setExporting(true);
    setNotice(null);
    try {
      const documentData = await api.request('/privacy/export');
      const blob = new Blob([JSON.stringify(documentData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `caplet-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setNotice({ type: 'success', text: 'Your data export was downloaded.' });
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'Could not prepare your data export.' });
    } finally {
      setExporting(false);
    }
  };

  const deleteAccount = async () => {
    if (deleteConfirmation !== DELETE_CONFIRMATION) {
      setNotice({ type: 'error', text: `Type ${DELETE_CONFIRMATION} exactly to continue.` });
      return;
    }
    setDeletingAccount(true);
    setNotice(null);
    try {
      await api.request('/privacy/account', { method: 'DELETE', body: JSON.stringify({ confirmation: DELETE_CONFIRMATION }) });
      await logout();
      navigate('/login', { replace: true, state: { accountDeleted: true } });
    } catch (error) {
      setDeleteConfirmation(null);
      setNotice({ type: 'error', text: error.message || 'Could not delete your account.' });
      setDeletingAccount(false);
    }
  };

  if (loading) {
    return <div className="grid min-h-[28rem] place-items-center" role="status" aria-label="Loading privacy controls"><CapletLoader message="Loading your privacy controls…" /></div>;
  }

  if (loadError || !preference) {
    return (
      <div className="grid min-h-[28rem] place-items-center text-center">
        <div className="max-w-md">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-surface-error text-text-error"><ExclamationTriangleIcon className="h-6 w-6" aria-hidden="true" /></span>
          <h2 className="mt-5 text-2xl font-display font-extrabold text-text-primary">Privacy controls are unavailable.</h2>
          <p role="alert" className="mt-2 text-sm font-medium text-text-muted">{loadError || 'No privacy preference record was returned.'}</p>
          <button type="button" onClick={load} className="btn-primary mx-auto mt-6"><ArrowPathIcon className="h-4 w-4" aria-hidden="true" /> Try again</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-10">
        <p className="font-hand text-accent text-lg -rotate-2 inline-block mb-1">your data, your choices</p>
        <h2 className="text-3xl font-display font-extrabold tracking-tight text-text-primary">Privacy & data</h2>
        <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-text-muted">Inspect what Caplet stores, control optional processing, download your information, or delete it permanently.</p>
      </div>

      <StatusNotice notice={notice} onDismiss={() => setNotice(null)} />

      <PreferenceControls
        preference={preference}
        consents={consents}
        savingKey={savingKey}
        ageVerificationRequired={ageVerificationRequired}
        onPreferenceChange={updatePreference}
        onConsentChange={updateConsent}
        onAcknowledgeAge={() => updatePreference('ageNoticeAcknowledged', true, { ageNoticeAcknowledged: true })}
        onGuardianRequest={requestGuardianConsent}
      />
      <AIHistory interactions={interactions} clearing={clearingHistory} onRequestClear={() => setConfirmClearHistory(true)} />
      <Processors processors={processorsData.processors} note={processorsData.note} />
      <DataActions
        exporting={exporting}
        deleting={deletingAccount}
        deleteConfirmation={deleteConfirmation}
        setDeleteConfirmation={setDeleteConfirmation}
        onExport={exportData}
        onRequestDelete={() => { setNotice(null); setDeleteConfirmation(''); }}
        onCancelDelete={() => setDeleteConfirmation(null)}
        onDelete={deleteAccount}
      />

      {confirmClearHistory && (
        <ConfirmationDialog
          title="Clear all AI activity history?"
          description="This removes every stored AI interaction summary for your account. Your core learning evidence and mastery records are not deleted."
          confirmLabel="Clear AI history"
          busy={clearingHistory}
          onCancel={() => setConfirmClearHistory(false)}
          onConfirm={clearHistory}
        />
      )}
    </div>
  );
}
