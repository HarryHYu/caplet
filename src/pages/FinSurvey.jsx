/**
 * Financial-literacy survey (temporary). Hidden on purpose: reachable only
 * by pasting /fin-survey — no nav links anywhere. Filling it in doubles as
 * Caplet signup (name + email + password create a student account; we say
 * so right on the form). Results live on the equally hidden
 * /fin-survey/results.
 */
import { useState } from 'react';
import api from '../services/api';
import { CONFIDENCE_TOPICS } from '../lib/finSurveyQuestions';

const YEARS = ['7', '8', '9', '10', '11', '12', 'Not at school'];
const COMMERCE = ['Commerce', 'Economics', 'Business Studies', 'Legal Studies', 'None of these'];
const SOURCES = ['School', 'Parents / family', 'Friends', 'Social media', 'YouTube / podcasts', 'Books', 'Nowhere really'];
const ENOUGH = [
    { key: 'yes', label: 'Yes, plenty' },
    { key: 'sort-of', label: 'Sort of, but not really' },
    { key: 'no', label: 'No, not even close' },
];
const SCHOOL_COURSE = [
    { key: 'definitely', label: 'Definitely' },
    { key: 'probably', label: 'Probably' },
    { key: 'maybe', label: 'Maybe' },
    { key: 'no', label: 'No' },
];
const CAPLET_COURSE = [
    { key: 'yes', label: 'Yes' },
    { key: 'maybe', label: 'Maybe' },
    { key: 'no', label: 'No' },
];
const AI_TRUST = [
    { key: 'yes', label: 'Yes, for most things' },
    { key: 'basics', label: 'Only for basic questions' },
    { key: 'no', label: 'No, I would not trust it' },
];

function SectionTitle({ children }) {
    return <h2 className="font-display text-base font-extrabold text-text-primary">{children}</h2>;
}

function Pills({ options, value, onChange, name }) {
    return (
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={name}>
            {options.map((opt) => {
                const key = opt.key ?? opt;
                const label = opt.label ?? opt;
                const active = value === key;
                return (
                    <button key={key} type="button" role="radio" aria-checked={active}
                        onClick={() => onChange(key)}
                        className={`focus-ring press rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors ${active ? 'border-accent bg-accent text-accent-contrast' : 'border-line-soft text-text-dim hover:border-text-dim hover:text-text-primary'}`}>
                        {label}
                    </button>
                );
            })}
        </div>
    );
}

function Checks({ options, value, onChange, name }) {
    const toggle = (opt) => onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);
    return (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={name}>
            {options.map((opt) => {
                const active = value.includes(opt);
                return (
                    <button key={opt} type="button" aria-pressed={active}
                        onClick={() => toggle(opt)}
                        className={`focus-ring press rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors ${active ? 'border-accent bg-accent-soft text-accent' : 'border-line-soft text-text-dim hover:border-text-dim hover:text-text-primary'}`}>
                        {active ? '✓ ' : ''}{opt}
                    </button>
                );
            })}
        </div>
    );
}

function Scale({ value, onChange, name, low = 'Not at all', high = 'Very' }) {
    return (
        <div className="flex items-center gap-2">
            <span className="w-16 text-right text-[10px] font-medium text-text-dim">{low}</span>
            <div className="flex gap-1.5" role="radiogroup" aria-label={name}>
                {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" role="radio" aria-checked={value === n}
                        onClick={() => onChange(n)}
                        className={`focus-ring press h-9 w-9 rounded-xl border text-sm font-extrabold transition-colors ${value === n ? 'border-accent bg-accent text-accent-contrast' : 'border-line-soft text-text-dim hover:border-text-dim hover:text-text-primary'}`}>
                        {n}
                    </button>
                ))}
            </div>
            <span className="w-16 text-[10px] font-medium text-text-dim">{high}</span>
        </div>
    );
}

function Field({ label, hint, children }) {
    return (
        <label className="block">
            <span className="mb-1 block text-xs font-bold text-text-primary">{label}</span>
            {children}
            {hint && <span className="mt-1 block text-[11px] leading-relaxed text-text-muted">{hint}</span>}
        </label>
    );
}

/** Like Field but for button-group questions: a <label> wrapper would donate
 * its text as every button's accessible name (and misdirect clicks). */
function Question({ label, hint, children }) {
    return (
        <div>
            <span className="mb-1 block text-xs font-bold text-text-primary">{label}</span>
            {children}
            {hint && <span className="mt-1 block text-[11px] leading-relaxed text-text-muted">{hint}</span>}
        </div>
    );
}

const inputCls = 'w-full rounded-xl border border-line-soft bg-surface-body px-3 py-2.5 text-sm text-text-primary';

export default function FinSurvey() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [school, setSchool] = useState('');
    const [yearLevel, setYearLevel] = useState(null);
    const [commerceSubjects, setCommerceSubjects] = useState([]);
    const [selfRating, setSelfRating] = useState(null);
    const [learnedFrom, setLearnedFrom] = useState([]);
    const [schoolEnough, setSchoolEnough] = useState(null);
    const [confidence, setConfidence] = useState({});
    const [wouldTakeSchoolCourse, setWouldTakeSchoolCourse] = useState(null);
    const [wouldTakeCapletCourse, setWouldTakeCapletCourse] = useState(null);
    const [aiAdvisorTrust, setAiAdvisorTrust] = useState(null);
    const [aiThoughts, setAiThoughts] = useState('');
    const [wishTaught, setWishTaught] = useState('');
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(null); // {accountCreated, accountExisted}

    const submit = async (e) => {
        e.preventDefault();
        const missing = [];
        if (!name.trim()) missing.push('your name');
        if (!email.trim()) missing.push('your email');
        if (password.length < 8) missing.push('a password (8+ characters)');
        if (!yearLevel) missing.push('your year level');
        if (!commerceSubjects.length) missing.push('the commerce subjects question');
        if (!selfRating) missing.push('your financial literacy rating');
        if (!schoolEnough) missing.push('whether school teaches enough');
        if (CONFIDENCE_TOPICS.some((t) => !confidence[t.key])) missing.push('each confidence rating');
        if (!wouldTakeSchoolCourse) missing.push('the school course question');
        if (!wouldTakeCapletCourse) missing.push('the Caplet course question');
        if (!aiAdvisorTrust) missing.push('the AI advisor question');
        if (missing.length) {
            setError(`Still needed: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? '…' : ''}`);
            return;
        }
        setError(null);
        setBusy(true);
        try {
            const result = await api.request('/fin-survey', {
                method: 'POST',
                body: JSON.stringify({
                    name: name.trim(),
                    email: email.trim(),
                    password,
                    school: school.trim(),
                    answers: {
                        yearLevel, commerceSubjects, selfRating, learnedFrom, schoolEnough,
                        confidence, wouldTakeSchoolCourse, wouldTakeCapletCourse, aiAdvisorTrust,
                        aiThoughts: aiThoughts.trim().slice(0, 1000),
                        wishTaught: wishTaught.trim().slice(0, 1000),
                    },
                }),
            });
            setDone(result);
        } catch (err) {
            setError(err?.message || 'Something went wrong — try again.');
        } finally {
            setBusy(false);
        }
    };

    if (done) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-surface-body px-4">
                <div className="surface-card max-w-md p-8 text-center">
                    <p className="text-4xl" aria-hidden="true">🎉</p>
                    <h1 className="mt-3 font-display text-2xl font-extrabold text-text-primary">Thanks — that genuinely helps.</h1>
                    <p className="mt-2 text-sm leading-relaxed text-text-dim">
                        {done.accountCreated && <>Your Caplet account is live too — log in at <strong>caplet.org</strong> with this email and the password you just picked.</>}
                        {done.accountExisted && <>You already had a Caplet account under this email, so we kept it exactly as it was.</>}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-surface-body px-4 py-10">
            <form onSubmit={submit} className="mx-auto flex max-w-xl flex-col gap-7">
                <header>
                    <p className="font-hand text-sm font-bold text-accent">Caplet · quick survey · ~3 minutes</p>
                    <h1 className="mt-1 font-display text-3xl font-extrabold tracking-[-0.02em] text-text-primary">
                        Money, school, and you
                    </h1>
                    <p className="mt-2 text-sm leading-relaxed text-text-dim">
                        We're researching how well school prepares students for real-world money decisions —
                        and whether a short financial literacy course is worth building. Heads up:
                        {' '}<strong className="text-text-primary">this survey also sets you up with a free Caplet account</strong>{' '}
                        (that's how we'll share what we build with you). No spam, ever.
                    </p>
                </header>

                <section className="surface-card flex flex-col gap-4 p-5">
                    <SectionTitle>About you</SectionTitle>
                    <Field label="Full name">
                        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120}
                            autoComplete="name" className={inputCls} />
                    </Field>
                    <Field label="Email">
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255}
                            autoComplete="email" className={inputCls} />
                    </Field>
                    <Field label="Choose a password" hint="This creates your Caplet account. If you already have one, we'll keep it — nothing changes.">
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8}
                            autoComplete="new-password" className={inputCls} />
                    </Field>
                    <Field label="School">
                        <input value={school} onChange={(e) => setSchool(e.target.value)} maxLength={160}
                            autoComplete="organization" className={inputCls} />
                    </Field>
                    <Question label="Year level">
                        <Pills name="Year level" options={YEARS} value={yearLevel} onChange={setYearLevel} />
                    </Question>
                </section>

                <section className="surface-card flex flex-col gap-4 p-5">
                    <SectionTitle>Your subjects</SectionTitle>
                    <Question label="Do you take any commerce subjects?" hint="Pick everything you currently study.">
                        <Checks name="Commerce subjects" options={COMMERCE}
                            value={commerceSubjects}
                            onChange={(next) => setCommerceSubjects(
                                next.includes('None of these') && !commerceSubjects.includes('None of these')
                                    ? ['None of these']
                                    : next.filter((v) => v !== 'None of these' || next.length === 1),
                            )} />
                    </Question>
                </section>

                <section className="surface-card flex flex-col gap-5 p-5">
                    <SectionTitle>Financial literacy</SectionTitle>
                    <Question label="How would you rate your financial literacy overall?">
                        <Scale name="Overall financial literacy" value={selfRating} onChange={setSelfRating} low="Clueless" high="Confident" />
                    </Question>
                    <Question label="Where has most of your money knowledge come from?">
                        <Checks name="Money knowledge sources" options={SOURCES} value={learnedFrom} onChange={setLearnedFrom} />
                    </Question>
                    <Question label="Do you think school teaches you enough about money?">
                        <Pills name="School teaches enough" options={ENOUGH} value={schoolEnough} onChange={setSchoolEnough} />
                    </Question>
                    <div>
                        <span className="mb-2 block text-xs font-bold text-text-primary">How confident are you with each of these?</span>
                        <div className="flex flex-col gap-3">
                            {CONFIDENCE_TOPICS.map((topic) => (
                                <div key={topic.key}>
                                    <span className="mb-1 block text-[11px] font-medium text-text-dim">{topic.label}</span>
                                    <Scale name={topic.label} value={confidence[topic.key] ?? null}
                                        onChange={(n) => setConfidence((prev) => ({ ...prev, [topic.key]: n }))} />
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="surface-card flex flex-col gap-4 p-5">
                    <SectionTitle>If it existed…</SectionTitle>
                    <Question label="If your school offered a financial literacy course, would you take it?">
                        <Pills name="School course" options={SCHOOL_COURSE} value={wouldTakeSchoolCourse} onChange={setWouldTakeSchoolCourse} />
                    </Question>
                    <Question label="If Caplet offered a free, short online financial literacy course, would you take it?">
                        <Pills name="Caplet course" options={CAPLET_COURSE} value={wouldTakeCapletCourse} onChange={setWouldTakeCapletCourse} />
                    </Question>
                </section>

                <section className="surface-card flex flex-col gap-4 p-5">
                    <SectionTitle>AI and your money</SectionTitle>
                    <Question label="Would you trust an AI as a financial advisor?">
                        <Pills name="AI advisor trust" options={AI_TRUST} value={aiAdvisorTrust} onChange={setAiAdvisorTrust} />
                    </Question>
                    <Field label="Any thoughts on AI giving financial advice? (optional)">
                        <textarea value={aiThoughts} onChange={(e) => setAiThoughts(e.target.value)} rows={3} maxLength={1000}
                            className={inputCls} placeholder="Honest takes welcome — good, bad, suspicious…" />
                    </Field>
                    <Field label="One money topic you wish someone would actually teach you? (optional)">
                        <textarea value={wishTaught} onChange={(e) => setWishTaught(e.target.value)} rows={2} maxLength={1000}
                            className={inputCls} />
                    </Field>
                </section>

                {error && <p className="text-sm font-bold text-text-error" role="alert">{error}</p>}
                <button type="submit" disabled={busy}
                    className="focus-ring press rounded-xl bg-accent px-5 py-3 text-sm font-extrabold text-accent-contrast disabled:opacity-50">
                    {busy ? 'Sending…' : 'Submit survey (and create my account)'}
                </button>
                <p className="pb-6 text-center text-[11px] text-text-muted">
                    Your answers are stored by Caplet for this research only. Your email is never shown publicly.
                </p>
            </form>
        </div>
    );
}
