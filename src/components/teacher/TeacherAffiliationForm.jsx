import { useState } from 'react';

const JURISDICTIONS = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'];

const EMPTY = {
  schoolName: '',
  schoolDomain: '',
  staffEmail: '',
  positionTitle: '',
  jurisdiction: 'NSW',
};

function initialForm(value) {
  return {
    ...EMPTY,
    schoolName: value?.name || '',
    schoolDomain: value?.domain || '',
    staffEmail: value?.staffEmail || '',
    positionTitle: value?.positionTitle || '',
    jurisdiction: value?.jurisdiction || 'NSW',
  };
}

export default function TeacherAffiliationForm({ initialValue, submitting, onSubmit, onCancel }) {
  const [form, setForm] = useState(() => initialForm(initialValue));

  const submit = (event) => {
    event.preventDefault();
    onSubmit({
      schoolName: form.schoolName.trim(),
      schoolDomain: form.schoolDomain.trim() || null,
      staffEmail: form.staffEmail.trim().toLowerCase(),
      positionTitle: form.positionTitle.trim() || null,
      jurisdiction: form.jurisdiction,
    });
  };

  return (
    <form onSubmit={submit} className="rounded-3xl bg-surface-raised p-7 shadow-[0_24px_54px_-40px_rgba(20,20,18,0.45)] md:p-9">
      <h2 className="text-2xl font-display font-extrabold text-text-primary">School affiliation</h2>
      <p className="mt-2 text-sm font-medium leading-relaxed text-text-muted">
        Use your school details so Caplet can verify teacher access safely.
      </p>
      <div className="mt-7 grid gap-5 sm:grid-cols-2">
        <label htmlFor="teacher-school-name" className="text-sm font-bold text-text-muted sm:col-span-2">
          School name
          <input
            id="teacher-school-name"
            required
            minLength={2}
            maxLength={200}
            autoComplete="organization"
            value={form.schoolName}
            onChange={(event) => setForm((current) => ({ ...current, schoolName: event.target.value }))}
            className="mt-2 w-full rounded-2xl border border-line-soft bg-surface-soft px-4 py-3 text-text-primary outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          />
        </label>
        <label htmlFor="teacher-staff-email" className="text-sm font-bold text-text-muted">
          School email
          <input
            id="teacher-staff-email"
            required
            type="email"
            maxLength={254}
            autoComplete="email"
            value={form.staffEmail}
            onChange={(event) => setForm((current) => ({ ...current, staffEmail: event.target.value }))}
            className="mt-2 w-full rounded-2xl border border-line-soft bg-surface-soft px-4 py-3 text-text-primary outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          />
        </label>
        <label htmlFor="teacher-school-domain" className="text-sm font-bold text-text-muted">
          School website domain <span className="font-medium text-text-dim">(optional)</span>
          <input
            id="teacher-school-domain"
            maxLength={253}
            placeholder="school.nsw.edu.au"
            inputMode="url"
            value={form.schoolDomain}
            onChange={(event) => setForm((current) => ({ ...current, schoolDomain: event.target.value }))}
            className="mt-2 w-full rounded-2xl border border-line-soft bg-surface-soft px-4 py-3 text-text-primary outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          />
        </label>
        <label htmlFor="teacher-position-title" className="text-sm font-bold text-text-muted">
          Position title <span className="font-medium text-text-dim">(optional)</span>
          <input
            id="teacher-position-title"
            maxLength={120}
            autoComplete="organization-title"
            placeholder="Economics Teacher"
            value={form.positionTitle}
            onChange={(event) => setForm((current) => ({ ...current, positionTitle: event.target.value }))}
            className="mt-2 w-full rounded-2xl border border-line-soft bg-surface-soft px-4 py-3 text-text-primary outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          />
        </label>
        <label htmlFor="teacher-jurisdiction" className="text-sm font-bold text-text-muted">
          State or territory
          <select
            id="teacher-jurisdiction"
            value={form.jurisdiction}
            onChange={(event) => setForm((current) => ({ ...current, jurisdiction: event.target.value }))}
            className="mt-2 w-full rounded-2xl border border-line-soft bg-surface-soft px-4 py-3 text-text-primary outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            {JURISDICTIONS.map((jurisdiction) => <option key={jurisdiction}>{jurisdiction}</option>)}
          </select>
        </label>
      </div>
      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {onCancel && <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>}
        <button type="submit" disabled={submitting} className="btn-primary sm:min-w-44">
          {submitting ? 'Sending request…' : 'Submit for review'}
        </button>
      </div>
    </form>
  );
}
