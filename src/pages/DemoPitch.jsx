/**
 * DemoPitch — the CapletMark investor pitch + roadmap, kept as a separate,
 * scrollable section of the /demo sandbox (reachable from the demo chrome).
 * This content is bespoke to the demo (it has no real page on the site).
 */

const MARK_BG = 'linear-gradient(140deg,#0b0b18 0%,#130d2e 55%,#0d1224 100%)';

function Kicker({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
      <div style={{ width: 28, height: 2, background: '#6366f1', borderRadius: 2 }} />
      <span style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#818cf8' }}>{label}</span>
    </div>
  );
}

function Section({ children }) {
  return (
    <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '96px 40px' }}>
      <div style={{ maxWidth: 960, width: '100%' }}>{children}</div>
    </section>
  );
}

function Problem() {
  const pains = [
    { n: '01', title: 'Manual & slow', body: 'Marking is done by hand, inconsistently, across thousands of scripts every exam season.' },
    { n: '02', title: 'AI gets it wrong', body: 'Generic models invent plausible-sounding marks with no rubric — inconsistent and untrustworthy.' },
    { n: '03', title: 'No scalable fix', body: "The industry's answer is hiring more markers. That isn't a solution, it's a band-aid." },
  ];
  return (
    <Section>
      <Kicker label="The Problem" />
      <div style={{ marginBottom: 48 }}>
        <div style={{ fontSize: 100, fontWeight: 900, color: 'white', lineHeight: 1, fontFamily: 'Georgia,serif', letterSpacing: '-2px' }}>$500M</div>
        <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.52)', marginTop: 10, maxWidth: 460, lineHeight: 1.55 }}>
          spent on marking in <strong style={{ color: 'rgba(255,255,255,0.8)' }}>NSW alone</strong>, every single year. Teachers spend up to <strong style={{ color: 'rgba(255,255,255,0.8)' }}>40% of their working hours</strong> on assessment — not teaching.
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 18 }}>
        {pains.map((p) => (
          <div key={p.n} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '22px 22px 24px' }}>
            <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(99,102,241,0.7)', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 14 }}>{p.n}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'white', marginBottom: 8 }}>{p.title}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.65 }}>{p.body}</div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Solution() {
  const items = ['Marking rubrics by question and year', 'Band exemplar responses (A–E)', 'Syllabus dot points mapped to criteria', 'Assessment criteria fully structured'];
  const rubric = [
    { band: 'Band 6', pts: '9–10', desc: 'Explains two distinct factors with precise data linkage and correct direction of effect.' },
    { band: 'Band 5', pts: '7–8', desc: 'Explains two factors clearly with supporting reasoning, minor gaps in data use.' },
    { band: 'Band 4', pts: '5–6', desc: 'Identifies two factors with some explanation, limited analytical depth.' },
    { band: 'Band 3', pts: '3–4', desc: 'Identifies one factor with explanation, or two factors without clear explanation.' },
  ];
  return (
    <Section>
      <div style={{ display: 'flex', gap: 56, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 300 }}>
          <Kicker label="The Solution" />
          <h2 style={{ fontSize: 54, fontWeight: 900, color: 'white', lineHeight: 1.08, marginBottom: 18, fontFamily: 'Georgia,serif' }}>
            Caplet<span style={{ color: '#818cf8' }}>Mark</span>
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.55)', lineHeight: 1.72, marginBottom: 32 }}>
            A structured library of marking rubrics, exemplar responses, and syllabus dot points — the data layer AI needs to grade student work <em style={{ color: 'rgba(255,255,255,0.8)', fontStyle: 'normal', fontWeight: 600 }}>accurately, not plausibly</em>.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            {items.map((item) => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(99,102,241,0.18)', border: '1.5px solid rgba(99,102,241,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#818cf8' }} />
                </div>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ width: 330, flexShrink: 0 }}>
          <div style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.22)', borderRadius: 20, padding: 24 }}>
            <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(99,102,241,0.75)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>HSC Economics — Q28b</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginBottom: 18, lineHeight: 1.5 }}>
              "Explain two factors that affect Australia's current account balance." (10 marks)
            </div>
            <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Marking Rubric</div>
            {rubric.map((r, i) => (
              <div key={r.band} style={{ display: 'flex', gap: 10, padding: '9px 0', borderBottom: i < rubric.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', alignItems: 'flex-start' }}>
                <div style={{ background: 'rgba(99,102,241,0.2)', borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 700, color: '#a5b4fc', flexShrink: 0, whiteSpace: 'nowrap' }}>{r.band}</div>
                <div>
                  <div style={{ fontSize: 10, color: 'rgba(99,102,241,0.6)', fontWeight: 600, marginBottom: 3 }}>{r.pts} pts</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.55 }}>{r.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

function Flow() {
  const steps = [
    { n: '01', label: 'Student submits', sub: 'Written response to exam question' },
    { n: '02', label: 'Library lookup', sub: 'CapletMark retrieves rubric + exemplars' },
    { n: '03', label: 'AI grades', sub: 'Model marks against real criteria only' },
    { n: '04', label: 'Structured feedback', sub: 'Band, score, targeted improvement notes' },
  ];
  return (
    <Section>
      <Kicker label="How It Works" />
      <h2 style={{ fontSize: 50, fontWeight: 900, color: 'white', lineHeight: 1.12, marginBottom: 48, fontFamily: 'Georgia,serif' }}>
        From submission<br />to feedback in seconds
      </h2>
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 0, marginBottom: 36, flexWrap: 'wrap' }}>
        {steps.flatMap((s, i) => {
          const card = (
            <div key={s.n} style={{ flex: 1, minWidth: 160, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '28px 20px 26px', textAlign: 'center' }}>
              <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(99,102,241,0.7)', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 16 }}>{s.n}</div>
              <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(99,102,241,0.16)', border: '1.5px solid rgba(99,102,241,0.35)', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#6366f1' }} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'white', marginBottom: 8 }}>{s.label}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)', lineHeight: 1.6 }}>{s.sub}</div>
            </div>
          );
          if (i < steps.length - 1) {
            return [card, <div key={`arr-${i}`} style={{ width: 44, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(99,102,241,0.5)', fontSize: 26 }}>→</div>];
          }
          return [card];
        })}
      </div>
      <div style={{ background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.22)', borderRadius: 14, padding: '18px 26px', display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#818cf8', flexShrink: 0, marginTop: 6 }} />
        <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 1.68 }}>
          <strong style={{ color: 'white' }}>The key insight:</strong> generic AI invents plausible-sounding marks because it has no rubric to work from. CapletMark ensures the model only grades against the actual marking criteria — the same document a human marker uses. That's what makes it trustworthy.
        </p>
      </div>
    </Section>
  );
}

function Market() {
  const tiers = [
    { label: 'NSW alone', value: '$500M', sub: 'annual marking spend, public + private' },
    { label: 'Australia-wide', value: '$3B+', sub: 'estimated total addressable market' },
    { label: 'Our target', value: '1%', sub: 'is already a significant, fundable business' },
  ];
  const moats = [
    'Already inside schools — students and teachers use Caplet today',
    'Data flywheel: every lesson and assessment generates richer training data',
    'First mover: no one has built a structured marking library at this scale',
  ];
  return (
    <Section>
      <div style={{ display: 'flex', gap: 60, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 300 }}>
          <Kicker label="The Opportunity" />
          <h2 style={{ fontSize: 46, fontWeight: 900, color: 'white', lineHeight: 1.12, marginBottom: 36, fontFamily: 'Georgia,serif' }}>
            A massive market<br />nobody has solved
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {tiers.map((t) => (
              <div key={t.label} style={{ display: 'flex', alignItems: 'baseline', gap: 22 }}>
                <div style={{ fontSize: 52, fontWeight: 900, color: '#a5b4fc', minWidth: 120, fontFamily: 'Georgia,serif', letterSpacing: '-1px' }}>{t.value}</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>{t.label}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{t.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ width: 300, flexShrink: 0 }}>
          <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.22)', borderRadius: 22, padding: '28px 24px' }}>
            <div style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: '#818cf8', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 22 }}>Why Caplet wins</div>
            {moats.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: 14, marginBottom: 20, alignItems: 'flex-start' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(99,102,241,0.22)', border: '1.5px solid rgba(99,102,241,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: '#a5b4fc' }}>{i + 1}</span>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.65 }}>{m}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

const FUTURE_ITEMS = [
  { label: 'AI Essay Marking', desc: 'Students write long-form answers; a model trained against real marking rubrics grades and returns targeted, specific feedback.' },
  { label: 'Adaptive Practice Paths', desc: 'Difficulty adjusts per student based on their quiz history. Everyone works at the level that pushes them exactly enough.' },
  { label: 'Shared Currency, Platform-wide', desc: 'One economy that works across every lesson, game, and activity on Caplet — earn it anywhere, spend it anywhere.' },
  { label: 'Assessment & Certification', desc: 'Formal assessments with custom rubrics, auto-generated certificates, and per-school progress reporting dashboards.' },
  { label: 'Open Platform & API', desc: 'Caplet becomes infrastructure — publishers, developers, and institutions build on top of it for any subject, any audience, anywhere.' },
];

function Roadmap() {
  return (
    <Section>
      <Kicker label="Roadmap" />
      <h2 style={{ fontSize: 48, fontWeight: 900, color: 'white', lineHeight: 1.12, marginBottom: 14, fontFamily: 'Georgia,serif' }}>
        The infrastructure<br />for how people learn
      </h2>
      <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, maxWidth: 520, marginBottom: 40 }}>
        Caplet v1 is live. Here's what's being built next — a platform open enough for anyone to build on, powerful enough to replace every tool a school currently uses.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {FUTURE_ITEMS.map((p) => (
          <div key={p.label} style={{ display: 'flex', gap: 20, alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 20 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#818cf8', flexShrink: 0, marginTop: 8 }} />
            <div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'white' }}>{p.label}</p>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>{p.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

export default function DemoPitch() {
  return (
    <div style={{ background: MARK_BG, color: 'white' }}>
      <Problem />
      <Solution />
      <Flow />
      <Market />
      <Roadmap />
    </div>
  );
}
