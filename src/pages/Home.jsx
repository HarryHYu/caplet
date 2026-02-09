import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { useCourses } from '../contexts/CoursesContext';
import cfcLogo from '../assets/CFC Logo (1).png';

const features = [
  {
    title: 'Budgeting without burnout',
    text: 'Build a weekly money system that survives rent week, groceries, and surprise costs.',
  },
  {
    title: 'Tax and super basics',
    text: 'Understand your payslip, tax withheld, and super contributions with plain-English examples.',
  },
  {
    title: 'Investing with context',
    text: 'Learn risk and long-term strategy before choosing products or platforms.',
  },
];

const faqData = [
  {
    question: 'What is financial literacy and why is it important?',
    answer:
      'Financial literacy means understanding how money decisions affect your daily life and long-term outcomes. It helps you budget with less stress, avoid expensive debt mistakes, and make clearer choices about tax, super, and investing. In practice, it gives you more control and fewer surprises.',
  },
  {
    question: 'Is Caplet really free?',
    answer:
      'Yes. Core courses and tools are free to access. The goal is to remove cost as a barrier, so students and early earners can build practical money skills before financial pressure grows.',
  },
  {
    question: 'What topics are covered?',
    answer:
      'Caplet covers everyday money fundamentals: budgeting, cash flow, debt, tax, superannuation, and investing basics. Content is written with Australian context, so examples reflect local systems and common decisions learners actually face.',
  },
  {
    question: 'Do I need prior knowledge?',
    answer:
      'No prior finance background is required. Lessons are structured from beginner-friendly foundations to more applied topics, so you can start where you are and move at a steady pace.',
  },
  {
    question: 'How often is content updated?',
    answer:
      'Content is reviewed regularly and improved over time as regulations, examples, and learner needs change. Priority updates focus on practical relevance and clarity rather than theory-heavy rewrites.',
  },
];

const Home = () => {
  const { courses } = useCourses();
  const featuredCourses = useMemo(() => courses.slice(0, 3), [courses]);
  const [openFaq, setOpenFaq] = useState(new Set());
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const toggleFaq = (index) => {
    const next = new Set(openFaq);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setOpenFaq(next);
  };

  const handleMouseMove = (e) => {
    const card = e.currentTarget;
    const box = card.getBoundingClientRect();
    const x = e.clientX - box.left;
    const y = e.clientY - box.top;
    const centerX = box.width / 2;
    const centerY = box.height / 2;
    const rotateX = (y - centerY) / 8;
    const rotateY = (centerX - x) / 8;

    setTilt({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  return (
    <div className="min-h-screen">
      <section className="section-hero py-24 md:py-32 lg:py-36 relative overflow-hidden">
        <div className="container-custom relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <div className="max-w-xl reveal-up">
              <span
                className="inline-block px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest mb-6"
                style={{ background: 'rgba(255,255,255,0.14)', color: '#fff' }}
              >
                Free Australian finance education
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6" style={{ color: '#fff' }}>
                Learn money skills
                <br />
                <span style={{ color: 'rgba(255,255,255,0.84)' }}>that reduce stress in real life.</span>
              </h1>
              <p className="text-lg md:text-xl leading-relaxed mb-8" style={{ color: 'rgba(255,255,255,0.85)' }}>
                Practical lessons for students and early professionals: budgeting, tax, super, and investing fundamentals.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/courses"
                  className="inline-flex items-center justify-center px-7 py-3.5 rounded-lg font-semibold text-base transition-all duration-200 hover:scale-[1.03]"
                  style={{ background: '#fff', color: 'var(--accent-strong)' }}
                >
                  Start learning free
                </Link>
                <Link
                  to="/tools"
                  className="inline-flex items-center justify-center px-7 py-3.5 rounded-lg font-semibold text-base transition-all duration-200 hover:bg-white/20"
                  style={{ border: '2px solid rgba(255,255,255,0.38)', color: '#fff' }}
                >
                  Explore tools
                </Link>
              </div>
            </div>

            <div className="relative flex justify-center lg:justify-end reveal-up" style={{ animationDelay: '200ms' }}>
              <div
                className="relative w-full max-w-md cursor-pointer transition-all duration-200 ease-out"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                style={{
                  transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
                  transformStyle: 'preserve-3d',
                }}
              >
                <div
                  className="rounded-xl overflow-hidden pointer-events-none"
                  style={{
                    background: 'var(--surface-soft)',
                    boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.35), 0 12px 24px -8px rgba(0, 0, 0, 0.2)',
                  }}
                >
                  <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--line-soft)', background: 'var(--surface-raised)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
                        Lesson 1 of 6
                      </span>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }}></div>
                        <div className="w-2 h-2 rounded-full" style={{ background: 'var(--line-soft)' }}></div>
                        <div className="w-2 h-2 rounded-full" style={{ background: 'var(--line-soft)' }}></div>
                        <div className="w-2 h-2 rounded-full" style={{ background: 'var(--line-soft)' }}></div>
                        <div className="w-2 h-2 rounded-full" style={{ background: 'var(--line-soft)' }}></div>
                        <div className="w-2 h-2 rounded-full" style={{ background: 'var(--line-soft)' }}></div>
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                      Understanding Your Payslip
                    </h3>
                  </div>

                  <div className="px-6 py-5" style={{ color: 'var(--text-primary)' }}>
                    <div className="space-y-4">
                      {[
                        { num: '✓', title: 'Gross vs Net Income', sub: 'What you earn vs what you take home' },
                        { num: '2', title: 'Tax Withholding (PAYG)', sub: 'How tax is deducted automatically' },
                        { num: '3', title: 'Superannuation Contributions', sub: "Your employer's contribution" }
                      ].map((item) => (
                        <div key={item.title} className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'color-mix(in srgb, var(--accent) 15%, transparent)' }}>
                            <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>{item.num}</span>
                          </div>
                          <div>
                            <p className="font-medium text-sm">{item.title}</p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{item.sub}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="px-6 py-3 flex justify-end border-t" style={{ borderColor: 'var(--line-soft)', background: 'var(--surface-raised)' }}>
                    <div className="px-4 py-2 rounded-md text-sm font-semibold" style={{ background: 'var(--accent)', color: '#fff' }}>
                      Continue →
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-4 border-y overflow-hidden whitespace-nowrap" style={{ borderColor: 'var(--line-soft)', background: 'var(--surface-soft)' }}>
        <div className="container-custom">
          <div className="flex items-center justify-center gap-x-12">
            <div className="flex items-center gap-3 shrink-0">
              <img src={cfcLogo} alt="CFC" className="h-6 w-auto opacity-80" />
              <span className="text-sm font-semibold tracking-wide uppercase opacity-70" style={{ color: 'var(--text-muted)' }}>
                associated with <a href="https://capitalfinanceclub.com" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--accent)] transition-colors underline decoration-dotted underline-offset-4">Capital Finance Club</a>
              </span>
            </div>

            <div className="hidden md:flex items-center gap-x-10 text-sm">
              {['Always free', 'Australian examples', 'Short practical lessons'].map((signal, i) => (
                <div key={signal} className="flex items-center gap-2 reveal-up" style={{ animationDelay: `${i * 80}ms` }}>
                  <span className="w-1 h-1 rounded-full opacity-40" style={{ background: 'var(--accent)' }} />
                  <span className="font-medium opacity-60" style={{ color: 'var(--text-muted)' }}>{signal}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 md:py-32">
        <div className="container-custom">
          <div className="text-center mb-16 reveal-up">
            <p className="section-kicker">What you’ll learn</p>
            <h2 className="section-title mt-2">Practical skills that stick</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-16">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="text-center reveal-up"
                style={{ animationDelay: `${index * 90}ms` }}
              >
                <div className="feature-icon mx-auto">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted leading-relaxed">{feature.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 md:py-32 border-b" style={{ borderColor: 'var(--line-soft)' }}>
        <div className="container-custom">
          <div className="text-center mb-16 reveal-up">
            <p className="section-kicker">Why Caplet</p>
            <h2 className="section-title mt-2">From internet noise to structured learning</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="panel p-8 reveal-up" style={{ background: 'color-mix(in srgb, var(--surface-soft) 90%, #fff 10%)' }}>
              <h3 className="text-2xl font-semibold mb-5">The internet alone</h3>
              <ul className="space-y-3 text-muted leading-relaxed">
                <li>Conflicting advice from random sources</li>
                <li>Jargon-heavy content with little context</li>
                <li>Hard to know what to do first</li>
                <li>Inconsistent quality and no learning sequence</li>
              </ul>
            </div>

            <div className="panel p-8 reveal-up" style={{ animationDelay: '120ms' }}>
              <h3 className="text-2xl font-semibold mb-5" style={{ color: 'var(--accent)' }}>Caplet approach</h3>
              <ul className="space-y-4">
                {[
                  'Structured lesson flow with clear next steps',
                  'Australian examples and practical scenarios',
                  'Short modules designed for busy schedules',
                  'Plain language focused on action, not hype',
                  'Free access so you can keep learning consistently',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-1.5 w-2.5 h-2.5 rounded-full" style={{ background: 'var(--accent)' }} />
                    <p className="text-muted">{item}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 md:py-32 border-b" style={{ borderColor: 'var(--line-soft)' }}>
        <div className="container-custom">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-16 reveal-up">
            <div className="max-w-2xl">
              <p className="section-kicker">Start here</p>
              <h2 className="section-title mt-1">Browse a course now</h2>
            </div>
            <Link to="/courses" className="btn-secondary w-fit px-8">Open full course library</Link>
          </div>

          {featuredCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {featuredCourses.map((course, index) => {
                const lessonCount = (course.modules || []).reduce(
                  (sum, mod) => sum + (mod.lessons || []).length,
                  0
                );

                return (
                  <Link
                    key={course.id}
                    to={`/courses/${course.id}`}
                    className="mesh-card p-8 reveal-up group"
                    style={{ animationDelay: `${index * 80}ms` }}
                  >
                    <p className="section-kicker mb-4">{course.level || 'General'}</p>
                    <h3 className="text-2xl font-semibold mb-3 line-clamp-2">{course.title}</h3>
                    <p className="text-muted text-base line-clamp-3 min-h-[4.5rem]">{course.shortDescription}</p>
                    <div className="mt-6 pt-5 border-t flex items-center justify-between text-sm text-muted" style={{ borderColor: 'var(--line-soft)' }}>
                      <span>{lessonCount} lessons</span>
                      <span>{course.duration} min</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="panel px-6 py-10 text-center reveal-up">
              <p className="text-muted">
                Courses are loading. You can always access the library directly from the
                <Link to="/courses" className="font-semibold ml-1 underline">courses page</Link>.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="py-24 md:py-36 border-t" style={{ borderColor: 'var(--line-soft)', background: 'var(--surface-body)' }}>
        <div className="container-custom">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-16 reveal-up">
              <p className="section-kicker">Got Questions?</p>
              <h2 className="section-title mt-2">Common things learners ask</h2>
            </div>

            <div className="space-y-4">
              {faqData.map((item, index) => (
                <div
                  key={item.question}
                  className="reveal-up border rounded-xl overflow-hidden transition-all duration-300 hover:border-accent/40"
                  style={{ animationDelay: `${index * 90}ms`, borderColor: 'var(--line-soft)', background: 'var(--surface-soft)' }}
                >
                  <button
                    className="w-full px-6 py-5 text-left flex justify-between items-center bg-transparent transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                    onClick={() => toggleFaq(index)}
                  >
                    <span className="font-semibold text-lg">{item.question}</span>
                    <svg
                      className={`w-5 h-5 transition-transform duration-300 ${openFaq.has(index) ? 'rotate-180 text-accent' : 'text-muted'}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  <div className={`grid transition-all duration-300 ease-in-out ${openFaq.has(index) ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                    <div className="overflow-hidden">
                      <div className="px-6 pb-6">
                        <div className="h-px w-full mb-5" style={{ background: 'var(--line-soft)' }} />
                        <p className="text-muted leading-relaxed">{item.answer}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 p-8 rounded-2xl border text-center reveal-up" style={{ borderColor: 'var(--line-soft)', background: 'var(--surface-soft)' }}>
              <h3 className="text-xl font-semibold mb-2">Still curious?</h3>
              <p className="text-muted mb-6">We can help you pick a starting point based on your goals.</p>
              <Link to="/faq" className="btn-secondary">View all FAQ docs</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 md:py-24 border-t" style={{ borderColor: 'var(--line-soft)', background: 'var(--surface-body)' }}>
        <div className="container-custom">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
            {/* Mission / Brand */}
            <div className="lg:pr-8">
              <div className="flex items-center gap-3 mb-6">
                <span className="w-9 h-9 flex items-center justify-center">
                  <img src="/logo.png" alt="Caplet" className="h-8 w-8 object-contain rounded-lg" />
                </span>
                <span className="text-xl font-bold" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>Caplet</span>
              </div>
              <p className="text-sm text-muted leading-relaxed">
                A non-profit initiative dedicated to bridging the financial literacy gap in Australia through structured, academic-grade education and practical utility.
              </p>
            </div>

            {/* Curriculum Column */}
            <div>
              <h4 className="text-xs uppercase tracking-widest font-bold mb-6" style={{ color: 'var(--accent)' }}>Curriculum</h4>
              <ul className="space-y-3 text-sm">
                <li><Link to="/courses" className="text-muted hover:text-[var(--text-primary)] transition-colors">Course Library</Link></li>
                <li><Link to="/courses" className="text-muted hover:text-[var(--text-primary)] transition-colors">Learning Pathways</Link></li>
                <li><Link to="/courses" className="text-muted hover:text-[var(--text-primary)] transition-colors">Academic Standards</Link></li>
                <li><Link to="/courses" className="text-muted hover:text-[var(--text-primary)] transition-colors">Course Accreditation</Link></li>
              </ul>
            </div>

            {/* Tools Column */}
            <div>
              <h4 className="text-xs uppercase tracking-widest font-bold mb-6" style={{ color: 'var(--accent)' }}>Calculators</h4>
              <ul className="space-y-3 text-sm">
                <li><Link to="/tools" className="text-muted hover:text-[var(--text-primary)] transition-colors">Tax & Income</Link></li>
                <li><Link to="/tools" className="text-muted hover:text-[var(--text-primary)] transition-colors">Superannuation</Link></li>
                <li><Link to="/tools" className="text-muted hover:text-[var(--text-primary)] transition-colors">Mortgage & Rent</Link></li>
                <li><Link to="/tools" className="text-muted hover:text-[var(--text-primary)] transition-colors">Utility Hub</Link></li>
              </ul>
            </div>

            {/* Institutional Column */}
            <div>
              <h4 className="text-xs uppercase tracking-widest font-bold mb-6" style={{ color: 'var(--accent)' }}>Institutional</h4>
              <ul className="space-y-3 text-sm">
                <li><Link to="/about" className="text-muted hover:text-[var(--text-primary)] transition-colors">Our Methodology</Link></li>
                <li><Link to="/faq" className="text-muted hover:text-[var(--text-primary)] transition-colors">Support Center</Link></li>
                <li><Link to="/contact" className="text-muted hover:text-[var(--text-primary)] transition-colors">Academic Inquiries</Link></li>
                <li><Link to="/terms" className="text-muted hover:text-[var(--text-primary)] transition-colors">Compliance & Ethics</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-16 pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted" style={{ borderColor: 'var(--line-soft)' }}>
            <p>© {new Date().getFullYear()} Caplet Australia. Dedicated to financial clarity.</p>
            <div className="flex items-center gap-6">
              <span className="hover:text-[var(--text-primary)] cursor-pointer transition-colors">Privacy Framework</span>
              <span className="hover:text-[var(--text-primary)] cursor-pointer transition-colors">Accessibility</span>
              <span className="hover:text-[var(--text-primary)] cursor-pointer transition-colors">AU Systems</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
