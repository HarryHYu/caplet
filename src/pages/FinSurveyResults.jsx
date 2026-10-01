/**
 * Financial-literacy survey results (temporary). Hidden on purpose:
 * reachable only by pasting /fin-survey/results — ungated by design, so the
 * API masks respondent emails and this page never sees full addresses.
 *
 * Every breakdown is a single-series bar list in the accent hue with every
 * value directly labelled — identity lives in the row labels, not color, so
 * no legend is needed and the lists double as their own table view.
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

function StatTile({ label, value, sub }) {
    return (
        <div className="surface-card flex-1 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-dim">{label}</p>
            <p className="mt-1 font-display text-3xl font-extrabold tabular-nums text-text-primary">{value}</p>
            {sub && <p className="text-[11px] font-medium text-text-muted">{sub}</p>}
        </div>
    );
}

/** One single-series breakdown: label · bar · count (pct). */
function BarRows({ title, rows, total, note }) {
    const max = Math.max(1, ...rows.map((r) => r.count));
    return (
        <div className="surface-card p-5">
            <h2 className="font-display text-sm font-extrabold text-text-primary">{title}</h2>
            {note && <p className="text-[11px] text-text-muted">{note}</p>}
            <div className="mt-3 flex flex-col gap-2">
                {rows.map((r) => (
                    <div key={r.label} className="flex items-center gap-2 text-xs" title={`${r.label}: ${r.count} of ${total}`}>
                        <span className="w-36 shrink-0 truncate font-medium text-text-dim">{r.label}</span>
                        <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-soft">
                            <div className="h-full rounded-full bg-accent" style={{ width: `${(r.count / max) * 100}%` }} />
                        </div>
                        <span className="w-20 shrink-0 text-right font-mono text-[11px] font-bold tabular-nums text-text-primary">
                            {r.count}<span className="font-medium text-text-dim"> · {total ? Math.round((r.count / total) * 100) : 0}%</span>
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function FinSurveyResults() {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        api.request('/fin-survey/results')
            .then(setData)
            .catch((err) => setError(err?.message || 'Could not load results.'));
    }, []);

    const stats = useMemo(() => {
        if (!data) return null;
        const rs = data.responses;
        const total = rs.length;
        const countBy = (key, order) => {
            const counts = {};
            rs.forEach((r) => {
                const v = r.answers?.[key];
                if (v != null && v !== '') counts[v] = (counts[v] || 0) + 1;
            });
            const keys = order || Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
            return keys.filter((k) => counts[k]).map((k) => ({ label: LABELS[key]?.[k] || String(k), count: counts[k] }));
        };
        const multiCountBy = (key) => {
            const counts = {};
            rs.forEach((r) => (r.answers?.[key] || []).forEach((v) => { counts[v] = (counts[v] || 0) + 1; }));
            return Object.keys(counts).sort((a, b) => counts[b] - counts[a]).map((k) => ({ label: k, count: counts[k] }));
        };
        const nums = (pick) => rs.map(pick).filter((n) => Number.isFinite(n));
        const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
        const selfRatings = nums((r) => Number(r.answers?.selfRating));
        const ratingDist = [1, 2, 3, 4, 5].map((n) => ({ label: `${n} / 5`, count: selfRatings.filter((v) => v === n).length }));
        const confidenceAvgs = CONFIDENCE_TOPICS.map((t) => ({
            label: t.label,
            avg: avg(nums((r) => Number(r.answers?.confidence?.[t.key]))),
        }));
        const texts = (key) => rs
            .filter((r) => r.answers?.[key])
            .map((r) => ({ id: r.id, who: `${String(r.name).split(' ')[0]}${r.school ? ` · ${r.school}` : ''}`, text: r.answers[key] }));
        const yesCaplet = rs.filter((r) => r.answers?.wouldTakeCapletCourse === 'yes').length;
        return {
            total,
            avgSelf: avg(selfRatings),
            yesCapletPct: total ? Math.round((yesCaplet / total) * 100) : 0,
            year: countBy('yearLevel', ORDERS.yearLevel),
            subjects: multiCountBy('commerceSubjects'),
            ratingDist,
            sources: multiCountBy('learnedFrom'),
            enough: countBy('schoolEnough', ORDERS.schoolEnough),
            confidenceAvgs,
            schoolCourse: countBy('wouldTakeSchoolCourse', ORDERS.wouldTakeSchoolCourse),
            capletCourse: countBy('wouldTakeCapletCourse', ORDERS.wouldTakeCapletCourse),
            aiTrust: countBy('aiAdvisorTrust', ORDERS.aiAdvisorTrust),
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

    return (
        <div className="min-h-screen bg-surface-body px-4 py-10">
            <div className="mx-auto flex max-w-3xl flex-col gap-4">
                <header>
                    <p className="font-hand text-sm font-bold text-accent">Caplet · survey results</p>
                    <h1 className="mt-1 font-display text-3xl font-extrabold tracking-[-0.02em] text-text-primary">
                        Money, school, and you
                    </h1>
                </header>

                {stats.total === 0 ? (
                    <div className="surface-card p-8 text-center text-sm text-text-dim">No responses yet — share the /fin-survey link.</div>
                ) : (
                    <>
                        <div className="flex flex-col gap-3 sm:flex-row">
                            <StatTile label="Responses" value={stats.total} />
                            <StatTile label="Accounts created" value={data.accountsCreated} sub="new Caplet signups" />
                            <StatTile label="Self-rated literacy" value={stats.avgSelf.toFixed(1)} sub="average out of 5" />
                            <StatTile label="Would take our course" value={`${stats.yesCapletPct}%`} sub="answered a straight yes" />
                        </div>

                        <BarRows title="Year level" rows={stats.year} total={stats.total} />
                        <BarRows title="Commerce subjects taken" rows={stats.subjects} total={stats.total} note="Multi-select — a respondent can appear in several rows." />
                        <BarRows title="Self-rated financial literacy" rows={stats.ratingDist} total={stats.total} />
                        <BarRows title="Where their money knowledge comes from" rows={stats.sources} total={stats.total} note="Multi-select." />
                        <BarRows title="Does school teach enough about money?" rows={stats.enough} total={stats.total} />

                        <div className="surface-card p-5">
                            <h2 className="font-display text-sm font-extrabold text-text-primary">Average confidence by topic (out of 5)</h2>
                            <div className="mt-3 flex flex-col gap-2">
                                {stats.confidenceAvgs.map((row) => (
                                    <div key={row.label} className="flex items-center gap-2 text-xs" title={`${row.label}: ${row.avg.toFixed(1)} / 5`}>
                                        <span className="w-36 shrink-0 truncate font-medium text-text-dim">{row.label}</span>
                                        <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-soft">
                                            <div className="h-full rounded-full bg-accent" style={{ width: `${(row.avg / 5) * 100}%` }} />
                                        </div>
                                        <span className="w-20 shrink-0 text-right font-mono text-[11px] font-bold tabular-nums text-text-primary">{row.avg.toFixed(1)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <BarRows title="Would take a school financial literacy course" rows={stats.schoolCourse} total={stats.total} />
                        <BarRows title="Would take a free Caplet course" rows={stats.capletCourse} total={stats.total} />
                        <BarRows title="Would trust an AI financial advisor" rows={stats.aiTrust} total={stats.total} />

                        {[['Thoughts on AI financial advice', stats.aiThoughts], ['Money topics they wish someone taught', stats.wishTaught]].map(([title, items]) => items.length > 0 && (
                            <div key={title} className="surface-card p-5">
                                <h2 className="font-display text-sm font-extrabold text-text-primary">{title}</h2>
                                <ul className="mt-3 flex flex-col gap-2.5">
                                    {items.map((q) => (
                                        <li key={q.id} className="border-l-2 border-line-soft pl-3">
                                            <p className="text-sm leading-relaxed text-text-primary">“{q.text}”</p>
                                            <p className="mt-0.5 text-[11px] font-bold text-text-dim">{q.who}</p>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}

                        <div className="surface-card overflow-x-auto p-5">
                            <h2 className="font-display text-sm font-extrabold text-text-primary">Respondents</h2>
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
                                            <td className="py-2 text-text-dim">{new Date(r.createdAt).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
