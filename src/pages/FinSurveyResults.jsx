/**
 * Financial-literacy survey results (temporary). Hidden on purpose:
 * reachable only by pasting /fin-survey/results — ungated by design, so the
 * API masks respondent emails and this page never sees full addresses.
 *
 * Charts follow one method: the data's job picks the form (donuts for
 * part-to-whole on ordered answers, columns for distributions, horizontal
 * bars for multi-select, a diverging stack for the Likert confidence grid),
 * colour does one job per chart (one hue for a single series, an ordinal
 * ramp for ordered answers, blue↔orange around a neutral for the Likert
 * stack), every mark has a hover tooltip, and every chart has a table twin.
 * Palettes were validated for light and dark surfaces.
 */
import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { CONFIDENCE_TOPICS } from '../lib/finSurveyQuestions';

const LABELS = {
    yearLevel: { 7: 'Year 7', 8: 'Year 8', 9: 'Year 9', 10: 'Year 10', 11: 'Year 11', 12: 'Year 12', 'Not at school': 'Not at school' },
    schoolEnough: { yes: 'Yes, plenty', 'sort-of': 'Sort of', no: 'Not even close' },
    wouldTakeSchoolCourse: { definitely: 'Definitely', probably: 'Probably', maybe: 'Maybe', no: 'No' },
    wouldTakeCapletCourse: { yes: 'Yes', maybe: 'Maybe', no: 'No' },
    aiAdvisorTrust: { yes: 'Yes, for most things', basics: 'Basics only', no: 'Would not trust it' },
};
const ORDERS = {
    yearLevel: ['7', '8', '9', '10', '11', '12', 'Not at school'],
    schoolEnough: ['yes', 'sort-of', 'no'],
    wouldTakeSchoolCourse: ['definitely', 'probably', 'maybe', 'no'],
    wouldTakeCapletCourse: ['yes', 'maybe', 'no'],
    aiAdvisorTrust: ['yes', 'basics', 'no'],
};
// Ordinal ramp, dark→light, for ordered answers (most positive first).
const ORDINAL = ['var(--fsr-o5)', 'var(--fsr-o4)', 'var(--fsr-o3)', 'var(--fsr-o2)', 'var(--fsr-o1)'];
const ordinalFor = (n) => (n === 3 ? [ORDINAL[0], ORDINAL[2], ORDINAL[4]] : n === 4 ? [ORDINAL[0], ORDINAL[1], ORDINAL[3], ORDINAL[4]] : ORDINAL.slice(0, n));
// Likert 1..5: two warm steps, a neutral, two cool steps.
const LIKERT = ['var(--fsr-dn2)', 'var(--fsr-dn1)', 'var(--fsr-mid)', 'var(--fsr-dp1)', 'var(--fsr-dp2)'];
const LIKERT_LABELS = ['1 · not at all', '2', '3 · neutral', '4', '5 · very'];

const CSS = `
.fsr {
  --fsr-s1: #1351AA;
  --fsr-o1: #86b6ef; --fsr-o2: #5598e7; --fsr-o3: #2a78d6; --fsr-o4: #1c5cab; --fsr-o5: #0d366b;
  --fsr-dn2: #eb6834; --fsr-dn1: #f5a383; --fsr-mid: #d9d5cd; --fsr-dp1: #86b6ef; --fsr-dp2: #2a78d6;
  --fsr-grid: var(--line-soft);
}
.dark .fsr {
  --fsr-s1: #3987e5;
  --fsr-o1: #9ec5f4; --fsr-o2: #6da7ec; --fsr-o3: #3987e5; --fsr-o4: #256abf; --fsr-o5: #184f95;
  --fsr-dn2: #d95926; --fsr-dn1: #f08a63; --fsr-mid: #4a4742; --fsr-dp1: #6da7ec; --fsr-dp2: #3987e5;
}
.fsr .fsr-mark { transition: opacity 120ms ease, transform 420ms cubic-bezier(0.16, 1, 0.3, 1); }
.fsr .fsr-mark:hover, .fsr .fsr-mark:focus-visible { opacity: 0.78; outline: none; }
.fsr .fsr-grow { transform-origin: bottom; transform: scaleY(0); }
.fsr.fsr-ready .fsr-grow { transform: scaleY(1); }
.fsr .fsr-grow-x { transform-origin: left; transform: scaleX(0); }
.fsr.fsr-ready .fsr-grow-x { transform: scaleX(1); }
@media (prefers-reduced-motion: reduce) {
  .fsr .fsr-mark { transition: none; }
  .fsr .fsr-grow, .fsr .fsr-grow-x { transform: none; }
}
`;

const pct = (n, total) => (total ? Math.round((n / total) * 100) : 0);

// ── Tooltip: one floating readout for every mark on the page ────────────────
function useTooltip() {
    const [tip, setTip] = useState(null);
    const show = (e, title, value) => setTip({ x: e.clientX, y: e.clientY, title, value });
    const move = (e) => setTip((t) => (t ? { ...t, x: e.clientX, y: e.clientY } : t));
    const hide = () => setTip(null);
    const bind = (title, value) => ({
        tabIndex: 0,
        role: 'img',
        'aria-label': `${title}: ${value}`,
        onPointerEnter: (e) => show(e, title, value),
        onPointerMove: move,
        onPointerLeave: hide,
        onFocus: (e) => { const r = e.currentTarget.getBoundingClientRect(); setTip({ x: r.left + r.width / 2, y: r.top, title, value }); },
        onBlur: hide,
    });
    const node = tip && (
        <div className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-[calc(100%+12px)] rounded-lg border border-line-soft bg-surface-raised px-2.5 py-1.5 shadow-pop"
            style={{ left: tip.x, top: tip.y }} role="status">
            <p className="font-display text-sm font-extrabold text-text-primary">{tip.value}</p>
            <p className="text-[11px] font-medium text-text-dim">{tip.title}</p>
        </div>
    );
    return { bind, node };
}

// ── Chart card with a table twin ────────────────────────────────────────────
function ChartCard({ title, note, rows, children, wide = false }) {
    const [asTable, setAsTable] = useState(false);
    return (
        <section className={`surface-card flex flex-col p-5 ${wide ? 'md:col-span-2' : ''}`}>
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h2 className="font-display text-base font-extrabold text-text-primary">{title}</h2>
                    {note && <p className="mt-0.5 text-[11px] text-text-muted">{note}</p>}
                </div>
                <button type="button" onClick={() => setAsTable((v) => !v)} aria-pressed={asTable}
                    className="focus-ring shrink-0 rounded-md border border-line-soft px-2 py-0.5 text-[10px] font-bold text-text-dim transition-colors hover:border-text-dim hover:text-text-primary">
                    {asTable ? 'Chart' : 'Table'}
                </button>
            </div>
            <div className="mt-4 flex-1">
                {asTable ? (
                    <table className="w-full text-left text-xs">
                        <tbody>
                            {rows.map((r) => (
                                <tr key={r.label} className="border-t border-line-soft">
                                    <td className="py-1.5 pr-3 font-medium text-text-primary">{r.label}</td>
                                    <td className="py-1.5 text-right font-mono tabular-nums text-text-dim">{r.value}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : children}
            </div>
        </section>
    );
}

// ── Donut: part-to-whole for one ordered question ───────────────────────────
function Donut({ segments, total, tip }) {
    const R = 72; const C = 2 * Math.PI * R; const GAP = 2.5;
    let acc = 0;
    const live = segments.filter((s) => s.value > 0);
    return (
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
            <svg viewBox="0 0 200 200" className="h-44 w-44 shrink-0" aria-hidden={false} role="group" aria-label="Donut chart">
                <circle cx="100" cy="100" r={R} fill="none" stroke="var(--surface-soft)" strokeWidth="26" />
                {live.map((s) => {
                    const len = (s.value / total) * C;
                    const dash = Math.max(0, len - (live.length > 1 ? GAP : 0));
                    const offset = -acc;
                    acc += len;
                    return (
                        <circle key={s.label} className="fsr-mark" cx="100" cy="100" r={R} fill="none"
                            stroke={s.color} strokeWidth="26" strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={offset}
                            transform="rotate(-90 100 100)" {...tip.bind(s.label, `${s.value} · ${pct(s.value, total)}%`)} />
                    );
                })}
                <text x="100" y="96" textAnchor="middle" className="pointer-events-none fill-[color:var(--text-primary)] font-display text-[30px] font-extrabold">{total}</text>
                <text x="100" y="116" textAnchor="middle" className="pointer-events-none fill-[color:var(--text-dim)] text-[11px] font-bold uppercase tracking-widest">answers</text>
            </svg>
            <ul className="flex w-full flex-col gap-1.5">
                {segments.map((s) => (
                    <li key={s.label} className="flex items-center gap-2 text-xs">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: s.color }} />
                        <span className="min-w-0 flex-1 truncate font-medium text-text-primary">{s.label}</span>
                        <span className="font-mono text-[11px] font-bold tabular-nums text-text-dim">{s.value} · {pct(s.value, total)}%</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

// ── Columns: a distribution over a few ordered buckets ──────────────────────
function Columns({ data, tip, height = 150 }) {
    const max = Math.max(1, ...data.map((d) => d.value));
    const W = 320; const H = height; const PAD_B = 26; const PAD_T = 18;
    const slot = W / data.length; const bw = Math.min(24, slot * 0.6);
    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="group" aria-label="Column chart">
            <line x1="0" x2={W} y1={H - PAD_B} y2={H - PAD_B} stroke="var(--fsr-grid)" strokeWidth="1" />
            {data.map((d, i) => {
                const h = Math.max(d.value > 0 ? 3 : 0, ((H - PAD_B - PAD_T) * d.value) / max);
                const x = i * slot + (slot - bw) / 2;
                const y = H - PAD_B - h;
                return (
                    <g key={d.label}>
                        <rect className="fsr-mark" x={i * slot} y={PAD_T - 10} width={slot} height={H - PAD_T + 10} fill="transparent"
                            {...tip.bind(d.label, `${d.value} · ${pct(d.value, d.total)}%`)} />
                        <g className="fsr-grow" style={{ transitionDelay: `${i * 40}ms` }}>
                            <path d={`M${x} ${H - PAD_B} v${-(h - 4)} q0 -4 4 -4 h${bw - 8} q4 0 4 4 v${h - 4} z`} fill={d.color || 'var(--fsr-s1)'} />
                        </g>
                        {d.value > 0 && (
                            <text x={x + bw / 2} y={y - 5} textAnchor="middle" className="fill-[color:var(--text-dim)] text-[10px] font-bold">{d.value}</text>
                        )}
                        <text x={i * slot + slot / 2} y={H - 8} textAnchor="middle" className="fill-[color:var(--text-dim)] text-[10px] font-medium">{d.short || d.label}</text>
                    </g>
                );
            })}
        </svg>
    );
}

// ── Horizontal bars: multi-select counts ────────────────────────────────────
function HBars({ data, tip }) {
    const max = Math.max(1, ...data.map((d) => d.value));
    return (
        <div className="flex flex-col gap-2">
            {data.map((d, i) => (
                <div key={d.label} className="flex items-center gap-3 text-xs">
                    <span className="w-28 shrink-0 truncate font-medium text-text-primary sm:w-40">{d.label}</span>
                    <div className="relative h-5 min-w-0 flex-1 fsr-mark" {...tip.bind(d.label, `${d.value} of ${d.total} · ${pct(d.value, d.total)}%`)}>
                        <div className="fsr-grow-x absolute inset-y-0 left-0 h-5 rounded-r-[4px]"
                            style={{ width: `${(d.value / max) * 100}%`, background: 'var(--fsr-s1)', transitionDelay: `${i * 40}ms` }} />
                    </div>
                    <span className="w-16 shrink-0 text-right font-mono text-[11px] font-bold tabular-nums text-text-dim">{d.value} · {pct(d.value, d.total)}%</span>
                </div>
            ))}
        </div>
    );
}

// ── Diverging stack: Likert 1..5 per topic, centred on neutral ──────────────
function LikertStack({ rows, tip }) {
    // One shared scale for every row: the track spans the furthest any row
    // reaches left of neutral-centre plus the furthest any row reaches right.
    // A fixed 50% centre let a mostly-negative topic run off the card.
    const shares = rows.map((row) => {
        const n = row.counts.reduce((a, b) => a + b, 0) || 1;
        return row.counts.map((c) => c / n);
    });
    const negExtent = Math.max(0, ...shares.map((s) => s[0] + s[1] + s[2] / 2));
    const posExtent = Math.max(0, ...shares.map((s) => s[3] + s[4] + s[2] / 2));
    const span = negExtent + posExtent || 1;
    const centre = negExtent / span;
    return (
        <div className="flex flex-col gap-3">
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-medium text-text-dim" aria-label="Legend">
                {LIKERT_LABELS.map((l, i) => (
                    <li key={l} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: LIKERT[i] }} />{l}</li>
                ))}
            </ul>
            {rows.map((row, r) => {
                const n = row.counts.reduce((a, b) => a + b, 0) || 1;
                const share = shares[r];
                // Start so the neutral band straddles the centre line.
                let x = centre - (share[0] + share[1] + share[2] / 2) / span;
                const confident = pct(row.counts[3] + row.counts[4], n);
                return (
                    <div key={row.label} className="flex items-center gap-3 text-xs">
                        <span className="w-28 shrink-0 truncate font-medium text-text-primary sm:w-40" title={row.label}>{row.label}</span>
                        <div className="relative h-6 min-w-0 flex-1 overflow-hidden">
                            <span className="absolute inset-y-0 w-px bg-[color:var(--line-strong)] opacity-40" style={{ left: `${centre * 100}%` }} />
                            {share.map((s, i) => {
                                const left = x; const w = s / span; x += w;
                                if (s <= 0) return null;
                                return (
                                    <div key={i} className="fsr-mark absolute inset-y-0 rounded-[3px]"
                                        style={{ left: `calc(${left * 100}% + 1px)`, width: `calc(${w * 100}% - 2px)`, background: LIKERT[i] }}
                                        {...tip.bind(`${row.label} — ${LIKERT_LABELS[i]}`, `${row.counts[i]} · ${pct(row.counts[i], n)}%`)} />
                                );
                            })}
                        </div>
                        <span className="w-24 shrink-0 whitespace-nowrap text-right font-mono text-[11px] font-bold tabular-nums text-text-dim" title="rated 4 or 5">{confident}% confident</span>
                    </div>
                );
            })}
        </div>
    );
}

function StatTile({ label, value, sub }) {
    return (
        <div className="surface-card flex-1 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-dim">{label}</p>
            <p className="mt-1 font-display text-3xl font-extrabold text-text-primary">{value}</p>
            {sub && <p className="text-[11px] font-medium text-text-muted">{sub}</p>}
        </div>
    );
}

export default function FinSurveyResults() {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [ready, setReady] = useState(false);
    const tip = useTooltip();

    useEffect(() => {
        api.request('/fin-survey/results')
            .then(setData)
            .catch((err) => setError(err?.message || 'Could not load results.'));
    }, []);
    useEffect(() => {
        if (!data) return undefined;
        const id = requestAnimationFrame(() => setReady(true));
        return () => cancelAnimationFrame(id);
    }, [data]);

    const stats = useMemo(() => {
        if (!data) return null;
        const rs = data.responses;
        const total = rs.length;
        const countBy = (key, order) => {
            const counts = {};
            rs.forEach((r) => { const v = r.answers?.[key]; if (v != null && v !== '') counts[v] = (counts[v] || 0) + 1; });
            const keys = order || Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
            return keys.map((k) => ({ key: k, label: LABELS[key]?.[k] || String(k), value: counts[k] || 0, total }));
        };
        const multiCountBy = (key) => {
            const counts = {};
            rs.forEach((r) => (r.answers?.[key] || []).forEach((v) => { counts[v] = (counts[v] || 0) + 1; }));
            return Object.keys(counts).sort((a, b) => counts[b] - counts[a]).map((k) => ({ label: k, value: counts[k], total }));
        };
        const selfRatings = rs.map((r) => Number(r.answers?.selfRating)).filter((n) => n >= 1 && n <= 5);
        const avgSelf = selfRatings.length ? selfRatings.reduce((a, b) => a + b, 0) / selfRatings.length : 0;
        const ratingDist = [1, 2, 3, 4, 5].map((n, i) => ({ label: `${n} of 5`, short: String(n), value: selfRatings.filter((v) => v === n).length, total, color: ORDINAL[4 - i] }));
        const likert = CONFIDENCE_TOPICS.map((t) => ({
            label: t.label.replace(/\s*\(.*\)/, ''),
            counts: [1, 2, 3, 4, 5].map((n) => rs.filter((r) => Number(r.answers?.confidence?.[t.key]) === n).length),
        }));
        const byDay = {};
        rs.forEach((r) => { const d = new Date(r.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }); byDay[d] = (byDay[d] || 0) + 1; });
        const timeline = Object.entries(byDay).reverse().map(([label, value]) => ({ label, value, total }));
        const texts = (key) => rs.filter((r) => r.answers?.[key]).map((r) => ({ id: r.id, who: `${String(r.name).split(' ')[0]}${r.school ? ` · ${r.school}` : ''}`, text: r.answers[key] }));
        const yesCaplet = rs.filter((r) => r.answers?.wouldTakeCapletCourse === 'yes').length;
        return {
            total,
            avgSelf,
            yesCapletPct: pct(yesCaplet, total),
            year: countBy('yearLevel', ORDERS.yearLevel).map((d) => ({ ...d, short: d.key === 'Not at school' ? 'n/a' : `Y${d.key}` })),
            subjects: multiCountBy('commerceSubjects'),
            ratingDist,
            sources: multiCountBy('learnedFrom'),
            enough: countBy('schoolEnough', ORDERS.schoolEnough),
            likert,
            schoolCourse: countBy('wouldTakeSchoolCourse', ORDERS.wouldTakeSchoolCourse),
            capletCourse: countBy('wouldTakeCapletCourse', ORDERS.wouldTakeCapletCourse),
            aiTrust: countBy('aiAdvisorTrust', ORDERS.aiAdvisorTrust),
            timeline,
            aiThoughts: texts('aiThoughts'),
            wishTaught: texts('wishTaught'),
        };
    }, [data]);

    if (error) {
        return <div className="flex min-h-screen items-center justify-center bg-surface-body"><p className="text-sm font-bold text-text-error">{error}</p></div>;
    }
    if (!stats) {
        return <div className="flex min-h-screen items-center justify-center bg-surface-body"><p className="text-sm font-medium text-text-dim">Loading results…</p></div>;
    }

    const rowsOf = (list) => list.map((d) => ({ label: d.label, value: `${d.value} · ${pct(d.value, d.total ?? stats.total)}%` }));
    const donut = (list) => {
        const colors = ordinalFor(list.length);
        return <Donut total={list.reduce((a, d) => a + d.value, 0)} segments={list.map((d, i) => ({ ...d, color: colors[i] }))} tip={tip} />;
    };

    return (
        <div className={`fsr min-h-screen bg-surface-body px-4 pb-16 pt-28 ${ready ? 'fsr-ready' : ''}`}>
            <style>{CSS}</style>
            {tip.node}
            <div className="mx-auto flex max-w-4xl flex-col gap-4">
                <header className="animate-rise-slow">
                    <span className="inline-block -rotate-2 font-hand text-lg font-bold text-accent">survey results</span>
                    <h1 className="mt-1 font-display text-4xl font-extrabold tracking-tight text-text-primary">Money, school, and you.</h1>
                    <p className="mt-2 text-sm text-text-dim">
                        {stats.total} response{stats.total === 1 ? '' : 's'} so far · emails masked on this page by design.
                    </p>
                </header>

                {stats.total === 0 ? (
                    <div className="surface-card p-10 text-center">
                        <p className="text-4xl" aria-hidden="true">📭</p>
                        <p className="mt-3 text-sm font-bold text-text-primary">No responses yet.</p>
                        <p className="mt-1 text-xs text-text-dim">Share the /fin-survey link and this page fills itself in.</p>
                    </div>
                ) : (
                    <>
                        <div className="flex flex-col gap-3 sm:flex-row">
                            <StatTile label="Responses" value={stats.total} />
                            <StatTile label="Accounts created" value={data.accountsCreated} sub="new Caplet signups" />
                            <StatTile label="Self-rated literacy" value={stats.avgSelf.toFixed(1)} sub="average out of 5" />
                            <StatTile label="Would take our course" value={`${stats.yesCapletPct}%`} sub="answered a straight yes" />
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <ChartCard title="Does school teach enough about money?" rows={rowsOf(stats.enough)}>{donut(stats.enough)}</ChartCard>
                            <ChartCard title="Would take a free Caplet course" rows={rowsOf(stats.capletCourse)}>{donut(stats.capletCourse)}</ChartCard>
                            <ChartCard title="Would take a school fin-lit course" rows={rowsOf(stats.schoolCourse)}>{donut(stats.schoolCourse)}</ChartCard>
                            <ChartCard title="Would trust an AI financial advisor" rows={rowsOf(stats.aiTrust)}>{donut(stats.aiTrust)}</ChartCard>

                            <ChartCard wide title="Confidence by topic" note="1 = not at all, 5 = very. The neutral band straddles the centre line; blue to the right is confident."
                                rows={stats.likert.map((r) => ({ label: r.label, value: r.counts.map((c, i) => `${i + 1}:${c}`).join('  ') }))}>
                                <LikertStack rows={stats.likert} tip={tip} />
                            </ChartCard>

                            <ChartCard title="Self-rated financial literacy" note="1 = clueless, 5 = confident." rows={rowsOf(stats.ratingDist)}>
                                <Columns data={stats.ratingDist} tip={tip} />
                            </ChartCard>
                            <ChartCard title="Year level" rows={rowsOf(stats.year)}>
                                <Columns data={stats.year} tip={tip} />
                            </ChartCard>
                            <ChartCard title="Commerce subjects taken" note="Multi-select — one respondent can count in several rows." rows={rowsOf(stats.subjects)}>
                                <HBars data={stats.subjects} tip={tip} />
                            </ChartCard>
                            <ChartCard title="Where their money knowledge comes from" note="Multi-select." rows={rowsOf(stats.sources)}>
                                <HBars data={stats.sources} tip={tip} />
                            </ChartCard>
                            {stats.timeline.length > 1 && (
                                <ChartCard wide title="Responses by day" rows={stats.timeline.map((d) => ({ label: d.label, value: String(d.value) }))}>
                                    <Columns data={stats.timeline} tip={tip} height={130} />
                                </ChartCard>
                            )}
                        </div>

                        {[['Thoughts on AI financial advice', stats.aiThoughts], ['Money topics they wish someone taught', stats.wishTaught]].map(([title, items]) => items.length > 0 && (
                            <section key={title} className="surface-card p-5">
                                <h2 className="font-display text-base font-extrabold text-text-primary">{title}</h2>
                                <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                                    {items.map((q) => (
                                        <li key={q.id} className="rounded-xl border border-line-soft bg-surface-body p-3">
                                            <p className="text-sm leading-relaxed text-text-primary">“{q.text}”</p>
                                            <p className="mt-1.5 text-[11px] font-bold text-text-dim">{q.who}</p>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        ))}

                        <section className="surface-card overflow-x-auto p-5">
                            <h2 className="font-display text-base font-extrabold text-text-primary">Respondents</h2>
                            <table className="mt-3 w-full text-left text-xs">
                                <thead>
                                    <tr className="text-[10px] font-bold uppercase tracking-widest text-text-dim">
                                        <th className="pb-2 pr-3">Name</th>
                                        <th className="pb-2 pr-3">School</th>
                                        <th className="pb-2 pr-3">Email</th>
                                        <th className="pb-2 pr-3">Account</th>
                                        <th className="pb-2">When</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.responses.map((r) => (
                                        <tr key={r.id} className="border-t border-line-soft text-text-primary">
                                            <td className="py-2 pr-3 font-bold">{r.name}</td>
                                            <td className="py-2 pr-3 text-text-dim">{r.school || '—'}</td>
                                            <td className="py-2 pr-3 font-mono text-[11px] text-text-dim">{r.email}</td>
                                            <td className="py-2 pr-3">{r.accountCreated ? '🆕 created' : 'existing'}</td>
                                            <td className="py-2 tabular-nums text-text-dim">{new Date(r.createdAt).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </section>
                    </>
                )}
            </div>
        </div>
    );
}
