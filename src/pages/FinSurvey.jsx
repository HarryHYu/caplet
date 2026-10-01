/**
 * Financial-literacy survey (temporary). Hidden on purpose: reachable only
 * by pasting /fin-survey — no nav links anywhere.
 *
 * A short multi-stage wizard in the site's own voice: hand-written kickers,
 * display headlines, rise/pop micro-animations, one question group per
 * stage, a progress bar that actually moves. Signed-out respondents pick a
 * password mid-flow (that's Caplet signup, and the form says so); signed-in
 * users never see any of that — we already know them.
 */
import { useMemo, useRef, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
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
    { key: 'no', label: 'I would not trust it' },
];

function Pills({ options, value, onChange, name }) {
    return (
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={name}>
            {options.map((opt) => {
                const key = opt.key ?? opt;
                const label = opt.label ?? opt;
                const active = value === key;
                return (
                    <button key={key} type="button" role="radio" aria-checked={active}
                        onClick={() => onChange(key)}
                        className={`focus-ring press rounded-full border-2 px-4 py-2 text-sm font-bold transition-all ${active ? 'animate-pop border-accent bg-accent text-accent-contrast shadow-card' : 'border-line-soft bg-surface-raised text-text-dim hover:-translate-y-0.5 hover:border-text-dim hover:text-text-primary'}`}>
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
        <div className="flex flex-wrap gap-2" role="group" aria-label={name}>
            {options.map((opt) => {
                const active = value.includes(opt);
                return (
                    <button key={opt} type="button" aria-pressed={active}
                        onClick={() => toggle(opt)}
                        className={`focus-ring press rounded-full border-2 px-4 py-2 text-sm font-bold transition-all ${active ? 'animate-pop border-accent bg-accent-soft text-accent shadow-card' : 'border-line-soft bg-surface-raised text-text-dim hover:-translate-y-0.5 hover:border-text-dim hover:text-text-primary'}`}>
                        {active ? '✓ ' : ''}{opt}
                    </button>
                );
            })}
        </div>
    );
}

function Scale({ value, onChange, name, low = 'Not at all', high = 'Very' }) {
    return (
        <div className="flex items-center gap-3">
            <span className="w-16 text-right text-[11px] font-bold text-text-dim">{low}</span>
            <div className="flex gap-2" role="radiogroup" aria-label={name}>
                {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" role="radio" aria-checked={value === n}
                        onClick={() => onChange(n)}
                        className={`focus-ring press h-11 w-11 rounded-2xl border-2 text-base font-extrabold transition-all ${value === n ? 'animate-pop border-accent bg-accent text-accent-contrast shadow-card' : 'border-line-soft bg-surface-raised text-text-dim hover:-translate-y-0.5 hover:border-text-dim hover:text-text-primary'}`}>
                        {n}
                    </button>
                ))}
            </div>
            <span className="w-16 text-[11px] font-bold text-text-dim">{high}</span>
        </div>
    );
}

function Question({ label, hint, children }) {
    return (
        <div>
            <span className="mb-2 block text-sm font-bold text-text-primary">{label}</span>
            {children}
            {hint && <span className="mt-1.5 block text-xs leading-relaxed text-text-muted">{hint}</span>}
        </div>
    );
}

function Field({ label, hint, children }) {
    return (
        <label className="block">
            <span className="mb-1.5 block text-sm font-bold text-text-primary">{label}</span>
            {children}
            {hint && <span className="mt-1.5 block text-xs leading-relaxed text-text-muted">{hint}</span>}
        </label>
    );
}

const inputCls = 'w-full rounded-xl border-2 border-line-soft bg-surface-raised px-3.5 py-2.5 text-sm text-text-primary transition-colors focus:border-accent';

export default function FinSurvey() {
    const { isAuthenticated, user } = useAuth();
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
    const [step, setStep] = useState(0); // 0 = splash
    const [error, setError] = useState(null);
    const [shake, setShake] = useState(0);
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(null);
    const topRef = useRef(null);

    // Signed-in students never see the account questions — we know them.
    const knownName = isAuthenticated ? `${user?.firstName || ''} ${user?.lastName || ''}`.trim() : '';
    const knownEmail = isAuthenticated ? user?.email || '' : '';

    const stages = useMemo(() => ([
        {
            emoji: '👋',
            kicker: isAuthenticated ? `hey ${user?.firstName || 'you'}` : 'first things first',
            title: isAuthenticated ? 'Quick intro' : 'Who are you?',
            valid: () => {
                if (!isAuthenticated && !name.trim()) return 'your name';
                if (!isAuthenticated && !/.+@.+\..+/.test(email)) return 'a real email';
                if (!isAuthenticated && password.length < 8) return 'a password with 8+ characters';
                if (!yearLevel) return 'your year level';
                return null;
            },
        },
        {
            emoji: '📚',
            kicker: 'subjects',
            title: 'What do you study?',
            valid: () => (commerceSubjects.length ? null : 'the subjects question — "None of these" counts'),
        },
        {
            emoji: '💸',
            kicker: 'be honest',
            title: 'You and money',
            valid: () => {
                if (!selfRating) return 'your overall rating';
                if (!schoolEnough) return 'the "does school teach enough" question';
                return null;
            },
        },
        {
            emoji: '💪',
            kicker: 'no judgement',
            title: 'How confident are you?',
            valid: () => (CONFIDENCE_TOPICS.some((t) => !confidence[t.key]) ? 'a rating for every topic' : null),
        },
        {
            emoji: '🎓',
            kicker: 'hypothetically…',
            title: 'If a course existed',
            valid: () => {
                if (!wouldTakeSchoolCourse) return 'the school course question';
                if (!wouldTakeCapletCourse) return 'the Caplet course question';
                return null;
            },
        },
        {
            emoji: '🤖',
            kicker: 'last one',
            title: 'AI and your money',
            valid: () => (aiAdvisorTrust ? null : 'the AI advisor question'),
        },
    ]), [isAuthenticated, user, name, email, password, yearLevel, commerceSubjects, selfRating, schoolEnough, confidence, wouldTakeSchoolCourse, wouldTakeCapletCourse, aiAdvisorTrust]);

    const stageIndex = step - 1; // step 0 is the splash
    const progress = step === 0 ? 0 : Math.round((stageIndex / stages.length) * 100);

    const bounce = (msg) => {
        setError(msg);
        setShake((n) => n + 1);
    };

    const next = () => {
        const missing = stages[stageIndex].valid();
        if (missing) { bounce(`Still needs ${missing}.`); return; }
        setError(null);
        if (stageIndex < stages.length - 1) {
            setStep(step + 1);
            topRef.current?.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
        } else {
            submit();
        }
    };

    const submit = async () => {
        setBusy(true);
        try {
            const result = await api.request('/fin-survey', {
                method: 'POST',
                body: JSON.stringify({
                    name: (isAuthenticated ? knownName : name).trim() || 'Anonymous',
                    email: (isAuthenticated ? knownEmail : email).trim(),
                    password: isAuthenticated ? undefined : password,
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
            bounce(err?.message || 'Something went wrong — try again.');
        } finally {
            setBusy(false);
        }
    };

    if (done) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-surface-body px-4">
                <div className="surface-card max-w-md p-10 text-center">
                    <p className="animate-tada text-6xl" aria-hidden="true">🎉</p>
                    <span className="mt-4 inline-block -rotate-2 font-hand text-xl font-bold text-accent">you're a legend</span>
                    <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-text-primary">That genuinely helps.</h1>
                    <p className="mt-3 text-sm leading-relaxed text-text-dim">
                        {done.accountCreated && <>Your Caplet account is live too — log in any time with this email and the password you picked.</>}
                        {done.accountExisted && !isAuthenticated && <>You already had a Caplet account under this email, so we kept it exactly as it was.</>}
                        {isAuthenticated && <>Your answers are in. Watch this space — if the course happens, you'll be first to know.</>}
                    </p>
                </div>
            </div>
        );
    }

    // ── Splash ──────────────────────────────────────────────────────────────
    if (step === 0) {
        return (
            <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface-body px-4">
                <div className="pointer-events-none absolute left-1/2 top-[12%] h-[40vw] max-h-[480px] w-[40vw] max-w-[480px] -translate-x-1/2 rounded-full bg-accent/10 blur-[110px]" />
                <div className="relative max-w-lg text-center">
                    <span className="inline-block -rotate-2 animate-rise font-hand text-2xl font-bold text-accent">quick one — ~2 minutes</span>
                    <h1 className="mt-3 animate-rise-slow font-display text-5xl font-extrabold leading-[0.98] tracking-tight text-text-primary sm:text-6xl">
                        Money, school,<br />and you.
                    </h1>
                    <p className="animate-fade-slide-up stagger-2 mx-auto mt-5 max-w-md text-base leading-relaxed text-text-dim">
                        Does school actually prepare you for real money decisions? We're finding out —
                        and deciding whether to build a short financial literacy course.
                        {!isAuthenticated && <> Answering sets you up with a <strong className="text-text-primary">free Caplet account</strong> along the way (we'll say when).</>}
                    </p>
                    <button type="button" onClick={() => setStep(1)}
                        className="focus-ring press animate-fade-slide-up stagger-3 mt-8 rounded-2xl bg-accent px-8 py-3.5 text-base font-extrabold text-accent-contrast shadow-pop transition-transform hover:-translate-y-0.5">
                        Let's go →
                    </button>
                    <p className="animate-fade-slide-up stagger-4 mt-4 text-xs text-text-muted">No spam, ever. Your email never shows up publicly.</p>
                </div>
            </div>
        );
    }

    const stage = stages[stageIndex];
    return (
        <div className="min-h-screen bg-surface-body px-4 py-8">
            <div ref={topRef} className="mx-auto max-w-xl">
                {/* progress */}
                <div className="flex items-center gap-3">
                    <span className="font-display text-sm font-extrabold tracking-tight text-text-primary">Caplet</span>
                    <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-soft">
                        <div className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out" style={{ width: `${Math.max(6, progress)}%` }} />
                    </div>
                    <span className="font-mono text-[11px] font-bold tabular-nums text-text-dim">{stageIndex + 1}/{stages.length}</span>
                </div>

                {/* stage card — keyed so each stage rises in fresh */}
                <div key={step} className="animate-rise-slow mt-6">
                    <span className="inline-block -rotate-2 font-hand text-lg font-bold text-accent">{stage.kicker}</span>
                    <h1 className="mt-1 flex items-center gap-3 font-display text-3xl font-extrabold tracking-tight text-text-primary">
                        <span className="animate-pop-in text-4xl" aria-hidden="true">{stage.emoji}</span>{stage.title}
                    </h1>

                    <div key={`card-${shake}`} className={`surface-card mt-5 flex flex-col gap-5 p-6 ${shake && error ? 'animate-shake-x' : ''}`}>
                        {stageIndex === 0 && (
                            <>
                                {!isAuthenticated && (
                                    <>
                                        <Field label="Full name">
                                            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoComplete="name" className={inputCls} />
                                        </Field>
                                        <Field label="Email">
                                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} autoComplete="email" className={inputCls} />
                                        </Field>
                                        <Field label="Choose a password" hint="Here's the bit we mentioned: this creates your free Caplet account. Already have one? Use that email — we won't touch it.">
                                            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} autoComplete="new-password" className={inputCls} />
                                        </Field>
                                    </>
                                )}
                                <Field label="School" hint={isAuthenticated ? 'So we know where the gaps are.' : undefined}>
                                    <input value={school} onChange={(e) => setSchool(e.target.value)} maxLength={160} autoComplete="organization" className={inputCls} />
                                </Field>
                                <Question label="Year level">
                                    <Pills name="Year level" options={YEARS} value={yearLevel} onChange={setYearLevel} />
                                </Question>
                            </>
                        )}
                        {stageIndex === 1 && (
                            <Question label="Do you take any commerce subjects?" hint="Pick everything you currently study.">
                                <Checks name="Commerce subjects" options={COMMERCE}
                                    value={commerceSubjects}
                                    onChange={(nextVal) => setCommerceSubjects(
                                        nextVal.includes('None of these') && !commerceSubjects.includes('None of these')
                                            ? ['None of these']
                                            : nextVal.filter((v) => v !== 'None of these' || nextVal.length === 1),
                                    )} />
                            </Question>
                        )}
                        {stageIndex === 2 && (
                            <>
                                <Question label="How would you rate your financial literacy overall?">
                                    <Scale name="Overall financial literacy" value={selfRating} onChange={setSelfRating} low="Clueless" high="Confident" />
                                </Question>
                                <Question label="Where has most of your money knowledge come from?" hint="Optional, pick any.">
                                    <Checks name="Money knowledge sources" options={SOURCES} value={learnedFrom} onChange={setLearnedFrom} />
                                </Question>
                                <Question label="Do you think school teaches you enough about money?">
                                    <Pills name="School teaches enough" options={ENOUGH} value={schoolEnough} onChange={setSchoolEnough} />
                                </Question>
                            </>
                        )}
                        {stageIndex === 3 && CONFIDENCE_TOPICS.map((topic, i) => (
                            <div key={topic.key} className={`animate-fade-slide-up stagger-${Math.min(4, i + 1)}`}>
                                <span className="mb-1.5 block text-sm font-bold text-text-primary">{topic.label}</span>
                                <Scale name={topic.label} value={confidence[topic.key] ?? null}
                                    onChange={(n) => setConfidence((prev) => ({ ...prev, [topic.key]: n }))} />
                            </div>
                        ))}
                        {stageIndex === 4 && (
                            <>
                                <Question label="If your school offered a financial literacy course, would you take it?">
                                    <Pills name="School course" options={SCHOOL_COURSE} value={wouldTakeSchoolCourse} onChange={setWouldTakeSchoolCourse} />
                                </Question>
                                <Question label="If Caplet offered a free, short online financial literacy course, would you take it?">
                                    <Pills name="Caplet course" options={CAPLET_COURSE} value={wouldTakeCapletCourse} onChange={setWouldTakeCapletCourse} />
                                </Question>
                            </>
                        )}
                        {stageIndex === 5 && (
                            <>
                                <Question label="Would you trust an AI as a financial advisor?">
                                    <Pills name="AI advisor trust" options={AI_TRUST} value={aiAdvisorTrust} onChange={setAiAdvisorTrust} />
                                </Question>
                                <Field label="Any thoughts on AI giving financial advice? (optional)">
                                    <textarea value={aiThoughts} onChange={(e) => setAiThoughts(e.target.value)} rows={3} maxLength={1000}
                                        className={inputCls} placeholder="Honest takes welcome — good, bad, suspicious…" />
                                </Field>
                                <Field label="One money topic you wish someone would actually teach you? (optional)">
                                    <textarea value={wishTaught} onChange={(e) => setWishTaught(e.target.value)} rows={2} maxLength={1000} className={inputCls} />
                                </Field>
                            </>
                        )}
                    </div>

                    {error && <p className="animate-rise mt-3 text-sm font-bold text-text-error" role="alert">{error}</p>}

                    <div className="mt-5 flex items-center gap-3">
                        <button type="button" onClick={() => { setError(null); setStep(step - 1); }}
                            className="focus-ring press rounded-xl border-2 border-line-soft px-4 py-2.5 text-sm font-bold text-text-dim transition-colors hover:border-text-dim hover:text-text-primary">
                            ← Back
                        </button>
                        <button type="button" onClick={next} disabled={busy}
                            className="focus-ring press ml-auto rounded-xl bg-accent px-6 py-2.5 text-sm font-extrabold text-accent-contrast shadow-pop transition-transform hover:-translate-y-0.5 disabled:opacity-50">
                            {busy ? 'Sending…' : stageIndex === stages.length - 1 ? 'Submit 🎉' : 'Next →'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
