import { Link } from 'react-router-dom';
import { useReveal } from '../lib/useReveal';

const TERMS = [
  {
    title: '1. Who these terms apply to',
    body: [
      'These terms govern use of the Caplet website, applications, learning tools, classrooms and related services. By creating an account or continuing to use Caplet, you agree to these terms. If a school or organisation provides access, its authorised representative is also responsible for the organisation’s use.',
      'Caplet is operated under the Caplet name. Privacy, safety, legal and account notices can be sent to contact@caplet.org.',
    ],
  },
  {
    title: '2. Learners under 18',
    body: [
      'A child should use Caplet with the involvement of a parent, guardian, school or teacher appropriate to their age and circumstances. Optional AI processing, learning analytics and classroom-data sharing are disabled for an under-18 account until the required guardian permission is recorded.',
      'Schools and teachers must confirm that their use is permitted by school policy, provide required notices and permissions, and supervise classroom activity. Caplet does not replace a school’s duty of care.',
    ],
  },
  {
    title: '3. Accounts and access',
    body: [
      'Provide accurate account information, keep sign-in credentials private and tell us promptly if an account may be compromised. Do not share class, live-session, editor or guardian links with people who should not receive them.',
      'You may not access another person’s account or data, bypass role or consent controls, probe the service without written permission, automate abusive traffic, or interfere with availability or security.',
    ],
  },
  {
    title: '4. Classroom and community conduct',
    body: [
      'Use classroom comments, live sessions and shared work respectfully. Do not post bullying, threats, sexual content, hate, harassment, impersonation, personal contact details, malicious files, unlawful material or content that puts a child at risk.',
      'Users can report classroom content. Caplet and authorised school administrators may preserve evidence, restrict access, remove content or accounts, and escalate a safety concern where reasonably necessary. An emergency should be reported to local emergency services, not only through Caplet.',
    ],
  },
  {
    title: '5. Your content and intellectual property',
    body: [
      'You keep ownership of original material you upload. You grant Caplet a limited, non-exclusive licence to host, copy, process and display it only as needed to operate, secure and improve the features you choose. You must have permission to upload or share the material.',
      'Caplet branding, hosted curriculum and product materials remain protected by their applicable licences and rights. Open-source code is governed by the licence published with that code; use of the hosted service does not transfer product trademarks or third-party content rights.',
    ],
  },
  {
    title: '6. AI-assisted features',
    body: [
      'AI features are optional and can produce inaccurate, incomplete or unsuitable output. AI feedback is practice guidance, not an official mark, professional judgment or verified fact. Review source material and involve a qualified person for consequential teaching, assessment, wellbeing or disciplinary decisions.',
      'Do not submit secrets or unnecessary sensitive information to an AI field. Rate, size and safety limits may apply. Caplet may decline or remove generated material that is unsafe, unlawful or outside the feature’s learning purpose.',
    ],
  },
  {
    title: '7. Financial education',
    body: [
      'Calculators, projections and examples are general educational information. They are not personal financial, tax, legal or credit advice and do not recommend a financial product. Rules, rates and assumptions can change; check current official information and seek appropriately licensed advice before acting.',
    ],
  },
  {
    title: '8. External links and sponsored listings',
    body: [
      'Caplet may link to third-party services or show clearly labelled sponsored or affiliate listings. Caplet may receive a commission if a user follows an affiliate link or completes an eligible action. A third party controls its own product, eligibility, price, terms and privacy practices; review those before proceeding.',
    ],
  },
  {
    title: '9. Availability, changes and suspension',
    body: [
      'We work to keep Caplet reliable, but maintenance, security incidents, provider outages and feature changes can interrupt access. We may change or retire a feature with reasonable notice where practical. Export important account data using the privacy controls.',
      'We may temporarily restrict or end access to protect users or the service, respond to legal obligations, address serious or repeated breaches, or investigate a safety concern. Where appropriate, we will explain the decision and provide a way to contact us.',
    ],
  },
  {
    title: '10. Consumer rights and responsibility',
    body: [
      'Nothing in these terms excludes, restricts or modifies a guarantee, right or remedy that cannot lawfully be excluded, including rights that may apply under the Australian Consumer Law.',
      'To the extent permitted by law, Caplet is not responsible for indirect or consequential loss caused by reliance on unverified AI output, educational scenarios, third-party services, or use outside the documented purpose. Each party remains responsible for loss caused by its fraud, unlawful conduct or breach of these terms.',
    ],
  },
  {
    title: '11. Updates, questions and complaints',
    body: [
      'We may update these terms when the service, law or risk profile changes. Material changes will be dated and communicated through the service or the account contact where reasonable. Continued use after the effective date means the updated terms apply.',
      'Contact contact@caplet.org with a question, complaint, accessibility issue or dispute. We will acknowledge and investigate it, and we will not prevent you from using an external regulator or court process available under Australian law.',
    ],
  },
];

export default function Terms() {
  useReveal();
  return (
    <main id="main-content" className="min-h-screen bg-surface-body py-28 text-text-primary">
      <div className="container-custom max-w-4xl">
        <header className="reveal rounded-3xl bg-surface-raised p-8 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)] md:p-12">
          <p className="font-hand text-xl text-accent">the rules, in plain language</p>
          <h1 className="mt-3 font-display text-5xl font-extrabold tracking-tight md:text-7xl">Terms of use</h1>
          <p className="mt-6 max-w-3xl text-lg font-medium leading-relaxed text-text-muted">
            These terms set the boundaries that keep Caplet useful, fair and safe for learners, families and schools.
          </p>
          <div className="mt-7 flex flex-wrap gap-3 text-xs font-bold text-text-muted">
            <span className="rounded-full bg-surface-soft px-4 py-2">Version 1.0</span>
            <span className="rounded-full bg-surface-soft px-4 py-2">Effective 13 July 2026</span>
          </div>
        </header>

        <div className="reveal-stagger mt-8 space-y-5">
          {TERMS.map((section) => (
            <section key={section.title} className="rounded-3xl border border-line-soft bg-surface-raised p-7 md:p-9">
              <h2 className="font-display text-2xl font-extrabold tracking-tight">{section.title}</h2>
              <div className="mt-4 space-y-4 text-base font-medium leading-relaxed text-text-muted">
                {section.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
            </section>
          ))}
        </div>

        <section className="mt-8 rounded-3xl bg-[color:var(--mark-blue)] p-8 text-white md:p-10">
          <h2 className="font-display text-3xl font-extrabold">Privacy is a separate promise.</h2>
          <p className="mt-3 max-w-2xl text-white/85">Read how Caplet collects, uses, shares, retains and deletes information, including the additional controls for children and AI features.</p>
          <Link to="/trust" className="mt-6 inline-flex rounded-2xl bg-white px-5 py-3 text-sm font-bold text-accent">Open the Trust Centre</Link>
        </section>
      </div>
    </main>
  );
}
