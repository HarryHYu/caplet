import { Link } from 'react-router-dom';
import { createElement } from 'react';
import {
  AcademicCapIcon,
  ArrowTopRightOnSquareIcon,
  CpuChipIcon,
  CurrencyDollarIcon,
  DocumentArrowDownIcon,
  LockClosedIcon,
  ShieldCheckIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { useReveal } from '../lib/useReveal';

const sections = [
  { id: 'privacy', label: 'Privacy overview', icon: ShieldCheckIcon },
  { id: 'student-data', label: 'Student data', icon: AcademicCapIcon },
  { id: 'ai', label: 'AI limitations', icon: CpuChipIcon },
  { id: 'financial-education', label: 'Financial education', icon: CurrencyDollarIcon },
  { id: 'your-choices', label: 'Your choices', icon: DocumentArrowDownIcon },
  { id: 'security', label: 'Security basics', icon: LockClosedIcon },
  { id: 'schools', label: 'Schools & teachers', icon: UserGroupIcon },
];

const TrustCenter = () => {
  useReveal();

  return (
    <div className="min-h-screen bg-surface-body py-28 selection:bg-accent selection:text-white">
      <div className="container-custom">
        <header className="reveal max-w-5xl mb-16">
          <span className="font-hand text-accent text-xl -rotate-2 inline-block mb-5">clear answers, in one place</span>
          <h1 className="font-display font-extrabold tracking-tight text-5xl md:text-7xl lg:text-8xl leading-[0.95] text-text-primary">
            Trust is part of<br />the product.
          </h1>
          <p className="mt-8 text-xl text-text-muted font-medium max-w-3xl leading-relaxed">
            Caplet is used by students, teachers and families. This centre explains what the platform does with data,
            where AI can help, where it can be wrong, and how our financial tools stay educational.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 text-xs font-bold text-text-muted">
            <span className="rounded-full bg-surface-raised px-4 py-2">Last reviewed 10 July 2026</span>
            <span className="rounded-full block-blue px-4 py-2 text-accent">Plain-language overview</span>
          </div>
        </header>

        <div className="grid gap-12 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="reveal lg:sticky lg:top-28 lg:self-start">
            <nav aria-label="Trust centre sections" className="rounded-3xl bg-surface-raised p-4 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
              {sections.map((section) => (
                <a key={section.id} href={`#${section.id}`} className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-text-muted hover:bg-surface-soft hover:text-accent transition-colors">
                  {createElement(section.icon, { className: 'h-5 w-5 shrink-0' })}
                  {section.label}
                </a>
              ))}
            </nav>
          </aside>

          <main className="reveal-stagger space-y-6 max-w-4xl">
            <TrustSection id="privacy" title="Privacy overview" icon={ShieldCheckIcon} tone="block-blue">
              <p>We collect the information needed to operate an account and deliver learning features: account details, course and classroom activity, saved work, study progress and the content a user chooses to submit.</p>
              <p>Financial profile or Financial Twin information is kept separate from general learning content and is used only to provide the feature the user requested. We do not sell student data or use it to place advertising.</p>
            </TrustSection>

            <TrustSection id="student-data" title="Student data handling" icon={AcademicCapIcon} tone="block-green">
              <p>Student work may include lesson progress, assignment submissions, saved slides, essays, practice answers and study-plan activity. Teachers see information connected to classes they manage; they do not receive a student&apos;s private financial profile.</p>
              <p>Students should avoid entering unnecessary personal, medical or highly sensitive information in free-text learning and AI fields.</p>
            </TrustSection>

            <TrustSection id="ai" title="AI limitations and human review" icon={CpuChipIcon} tone="block-amber">
              <p>AI can help draft lessons, organise revision, explain concepts and provide practice feedback. It can also misunderstand a response, omit context or state something inaccurate.</p>
              <p>AI feedback is not an official mark. Important assessment, wellbeing, disciplinary and teaching decisions require a qualified person to review the original work and relevant school policy.</p>
              <Link to="/edutools" className="inline-flex items-center gap-2 text-sm font-bold text-accent hover:text-accent-strong">
                See the education tools <ArrowTopRightOnSquareIcon className="h-4 w-4" />
              </Link>
            </TrustSection>

            <TrustSection id="financial-education" title="Financial education, not personal advice" icon={CurrencyDollarIcon} tone="block-blue">
              <p>Caplet&apos;s calculators and projections provide general education and scenario modelling. They show what may happen under the inputs and assumptions supplied; they do not tell a person which financial product to buy or what personal action they should take.</p>
              <p>Figures can become outdated and projections are uncertain. Check current information from an official source and seek appropriately licensed advice before making a financial decision.</p>
              <Link to="/fintools" className="inline-flex items-center gap-2 text-sm font-bold text-accent hover:text-accent-strong">
                Review the financial tools <ArrowTopRightOnSquareIcon className="h-4 w-4" />
              </Link>
            </TrustSection>

            <TrustSection id="your-choices" title="Account deletion and data export" icon={DocumentArrowDownIcon} tone="block-cream">
              <p>To request a copy of account data or deletion of an account, email <a className="font-bold text-accent" href="mailto:contact@caplet.org?subject=Caplet%20data%20request">contact@caplet.org</a> from the address connected to the account. We will verify the request before acting.</p>
              <p>Financial Twin consent can be revoked inside that tool. Revocation removes the stored connection and imported transactions associated with it. Some records may need to be retained where required for security, legal or operational reasons.</p>
            </TrustSection>

            <TrustSection id="security" title="Security basics" icon={LockClosedIcon} tone="block-green">
              <p>Caplet uses authenticated access for private account features, role checks for administrative functions, protected secrets and controlled database migrations. Financial data is minimised and sensitive values are not written to application logs.</p>
              <p>No online service can promise perfect security. Report a suspected vulnerability or account compromise promptly so it can be investigated.</p>
            </TrustSection>

            <TrustSection id="schools" title="School and teacher responsibilities" icon={UserGroupIcon} tone="block-amber">
              <p>Schools and teachers remain responsible for student supervision, curriculum choices, classroom access, assessment decisions and compliance with their own policies and local requirements.</p>
              <p>Before using Caplet with a class, schools should review this information, decide which features are appropriate for their students and provide any notices or permissions their context requires.</p>
            </TrustSection>

            <section id="contact" className="scroll-mt-28 rounded-3xl bg-[color:var(--mark-blue)] p-8 md:p-12 text-white shadow-[0_30px_60px_-38px_rgba(19,81,170,0.7)]">
              <p className="font-hand text-xl text-white/80 -rotate-2 inline-block mb-3">need a human?</p>
              <h2 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight">Contact and escalation</h2>
              <p className="mt-4 max-w-2xl text-white/85 leading-relaxed">For privacy, safety, security, school-readiness or account-data questions, contact us directly. Include the account email and enough detail to route the request, but do not send passwords or financial records.</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a href="mailto:contact@caplet.org" className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-accent hover:-translate-y-0.5 transition-transform">contact@caplet.org</a>
                <Link to="/contact" className="rounded-2xl bg-white/10 px-5 py-3 text-sm font-bold text-white hover:bg-white/20 transition-colors">Contact page</Link>
              </div>
            </section>

            <section className="rounded-3xl border border-line-soft p-8 text-sm text-text-muted leading-relaxed">
              <h2 className="font-display text-xl font-bold text-text-primary mb-3">Terms of use</h2>
              <p>Use Caplet lawfully and respectfully. Do not attempt to access another person&apos;s account, disrupt the service, upload harmful material or present generated content as verified fact. The service is provided for learning and general information and may change as features improve.</p>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
};

function TrustSection({ id, title, icon, tone, children }) {
  return (
    <section id={id} className={`scroll-mt-28 rounded-3xl p-8 md:p-10 ${tone} shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]`}>
      <div className="mb-6 flex items-center gap-4">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-surface-raised shadow-[0_12px_28px_-22px_rgba(20,20,18,0.5)]">
          {createElement(icon, { className: 'h-6 w-6 text-accent' })}
        </span>
        <h2 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight text-text-primary">{title}</h2>
      </div>
      <div className="space-y-4 text-base font-medium leading-relaxed text-text-muted">{children}</div>
    </section>
  );
}

export default TrustCenter;
