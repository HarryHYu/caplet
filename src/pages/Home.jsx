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
    question: 'How is CapletEdu different from other platforms?',
    answer:
      'CapletEdu is specifically designed for institutional integration into school curricula. We work directly with educators to develop structured lessons tailored to Australian students. Currently integrated into Knox Grammar School Commerce Department and used by Capital Finance Club.',
  },
  {
    question: 'Is CapletEdu free to use?',
    answer:
      'Yes. CapletEdu currently provides free educational services. Courses and tools are accessible at no cost. Future development may include SaaS offerings for schools and large institutions.',
  },
  {
    question: 'What topics are covered?',
    answer:
      'CapletEdu covers financial fundamentals tailored to Australian students: budgeting, tax, superannuation, investing basics, and business finance. All content is structured with Australian context and designed for integration into school curricula.',
  },
  {
    question: 'Can I trust the information on Caplet?',
    answer:
      'Yes. All content is thoroughly researched from reliable sources including Australian government resources, financial regulatory bodies, and academic research. We recommend consulting qualified professionals for personalized advice.',
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
      {/* Hero Section */}
      <section className="pt-16 pb-20 md:pt-20 md:pb-24 lg:pt-24 lg:pb-28 relative overflow-hidden">
        <div className="container-custom relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="max-w-xl animate-slide-up">
              <span className="section-kicker mb-6">
                Institutional Financial Education
              </span>
              <h1 className="text-6xl md:text-7xl lg:text-8xl font-extrabold leading-[0.9] mb-10 text-black dark:text-white tracking-tighter">
                Financial literacy <br />
                <span className="text-zinc-600 dark:text-zinc-700">for schools.</span>
              </h1>
              <p className="text-xl leading-relaxed mb-12 text-zinc-500 dark:text-zinc-400 font-medium max-w-md">
                Bridging the literacy gap with professional, structured learning modules tailored for the Australian context.
              </p>
              <div className="flex flex-col sm:flex-row gap-6">
                <Link to="/courses" className="btn-primary flex items-center justify-center">
                  Get Started Free
                </Link>
                <Link to="/tools" className="btn-secondary flex items-center justify-center">
                  Explore Terminals
                </Link>
              </div>
            </div>

            <div className="relative flex justify-center lg:justify-end animate-fade-in" style={{ animationDelay: '300ms' }}>
              <div
                className="relative w-full max-w-md cursor-crosshair transition-all duration-300 ease-out"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                style={{
                  transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
                  transformStyle: 'preserve-3d',
                }}
              >
                <div className="bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900 shadow-2xl p-1">
                  <div className="bg-zinc-50 dark:bg-zinc-900 px-8 py-6 flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand mb-1">Module 01</p>
                      <h3 className="text-lg font-extrabold text-black dark:text-white uppercase tracking-tight">Income & Taxation</h3>
                    </div>
                    <div className="w-10 h-10 border border-brand/20 flex items-center justify-center text-brand font-bold text-xs">
                      1/4
                    </div>
                  </div>

                  <div className="px-8 py-10 space-y-8">
                    {[
                      { num: '•', title: 'Gross vs Net Income', sub: 'The difference between earning and taking home' },
                      { num: '•', title: 'Tax Withholding (PAYG)', sub: 'How the ATO collects tax automatically' },
                      { num: '•', title: 'Superannuation', sub: 'Building your long-term wealth sequence' }
                    ].map((item) => (
                      <div key={item.title} className="flex items-start gap-4 group">
                        <div className="text-brand font-bold text-lg leading-none group-hover:scale-125 transition-transform">{item.num}</div>
                        <div>
                          <p className="font-bold text-sm text-black dark:text-white uppercase tracking-wide leading-tight">{item.title}</p>
                          <p className="text-xs mt-1 text-zinc-500 dark:text-zinc-400 font-medium">{item.sub}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="px-8 py-6 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                    <span className="text-[10px] uppercase font-bold text-zinc-400">Time: 12m</span>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-brand">Proceed to checkout →</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="py-12 border-y border-zinc-100 dark:border-zinc-900 page-section-soft">
        <div className="container-custom">
          <div className="flex flex-wrap items-center justify-center md:justify-between gap-10 opacity-50 grayscale contrast-125">
            <img src={cfcLogo} alt="CFC" className="h-6 w-auto dark:invert" />
            <div className="flex gap-10 items-center">
              {['Structured', 'Standardised', 'Integrated'].map((label) => (
                <span key={label} className="text-[10px] font-bold uppercase tracking-[0.3em] text-black dark:text-white border-b border-black/20 pb-1">
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-32 lg:py-48">
        <div className="container-custom">
          <div className="mb-24 reveal-up">
            <p className="section-kicker">Core Capabilities</p>
            <h2 className="section-title">Practical logic <br />over theory.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="group animate-slide-up"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <div className="w-12 h-1 overflow-hidden bg-zinc-100 dark:bg-zinc-800 mb-8">
                  <div className="w-full h-full bg-brand origin-left transition-transform duration-500 group-hover:scale-x-50" />
                </div>
                <h3 className="text-xl font-extrabold mb-4 text-black dark:text-white uppercase tracking-tight leading-none">{feature.title}</h3>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium leading-relaxed">{feature.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Methodology */}
      <section className="py-32 lg:py-48 page-section-dark overflow-hidden">
        <div className="container-custom relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-[0.3em] text-brand mb-6">Our Sequence</p>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-10 tracking-tighter leading-none">The Caplet <br />Pathway.</h2>
              <p className="text-zinc-400 text-lg font-medium leading-relaxed max-w-sm mb-12">
                We transform complex financial data into a structured learning journey built for high-impact absorption.
              </p>
              <div className="flex gap-4">
                <div className="w-12 h-[1px] bg-brand mt-3 shrink-0" />
                <p className="text-xs uppercase font-bold tracking-widest text-white/50">Institutional Standards Applied Globally</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="p-10 border border-white/10 bg-white/5 backdrop-blur-sm">
                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-6">Phase Alpha: Foundations</h3>
                <ul className="space-y-4">
                  {['Budgeting Systems', 'Tax Compliance', 'Superannuation'].map(item => (
                    <li key={item} className="text-sm font-bold flex items-center justify-between">
                      <span>{item}</span>
                      <span className="text-[10px] text-brand">01</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-10 bg-brand text-white">
                <h3 className="text-xs font-bold uppercase tracking-widest text-white/60 mb-6">Phase Beta: Applied Logic</h3>
                <ul className="space-y-4">
                  {['Investment Strategy', 'Risk Management', 'Curriculum Sync'].map(item => (
                    <li key={item} className="text-sm font-bold flex items-center justify-between">
                      <span>{item}</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Courses Library */}
      <section className="py-32 lg:py-48 page-section-light">
        <div className="container-custom">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-10 mb-24">
            <div className="reveal-up">
              <p className="section-kicker">Library</p>
              <h2 className="section-title">Academic <br />catalog.</h2>
            </div>
            <Link to="/courses" className="btn-secondary h-fit">
              View All Modules
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredCourses.length > 0 ? (
              featuredCourses.map((course, index) => (
                <Link
                  key={course.id}
                  to={`/courses/${course.id}`}
                  className="mesh-card p-0 group bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-4">
                      <div className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                        {course.level || 'L1'}
                      </div>
                    </div>
                    <h3 className="text-2xl font-extrabold text-black dark:text-white uppercase tracking-tighter mb-4 line-clamp-1 group-hover:text-brand transition-colors">
                      {course.title}
                    </h3>
                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                      {course.shortDescription}
                    </p>
                  </div>
                  <div className="p-8 flex items-center justify-between">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-black dark:text-white">
                      {course.duration} Minutes
                    </div>
                    <div className="text-brand font-bold text-xs uppercase tracking-tighter group-hover:translate-x-1 transition-transform">
                      Enter Module →
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="col-span-full py-20 text-center border border-dashed border-zinc-200 dark:border-zinc-800">
                <p className="text-zinc-400 font-bold uppercase tracking-widest text-xs italic">Loading Library...</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-32 lg:py-48 page-section-light overflow-hidden border-t border-zinc-100 dark:border-zinc-900">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="reveal-up">
              <p className="section-kicker">Our Mission</p>
              <h2 className="section-title mb-10">Institutional <br />standard.</h2>
              <p className="text-xl text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed max-w-xl mb-12">
                CapletEdu delivers structured financial education for Australian students, integrated into school curricula and designed for high-impact absorption. Currently serving Knox Grammar School Commerce Department for Years 9–10.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="p-8 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900">
                  <h3 className="text-sm font-extrabold text-black dark:text-white uppercase tracking-wider mb-4">Integration</h3>
                  <ul className="text-xs text-zinc-500 dark:text-zinc-400 space-y-3 font-medium">
                    <li className="flex items-center gap-2"><span className="w-1 h-1 bg-brand rounded-full" /> Knox Grammar School</li>
                    <li className="flex items-center gap-2"><span className="w-1 h-1 bg-brand rounded-full" /> Capital Finance Club</li>
                    <li className="flex items-center gap-2"><span className="w-1 h-1 bg-brand rounded-full" /> Scalable Systems</li>
                  </ul>
                </div>
                <div className="p-8 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900">
                  <h3 className="text-sm font-extrabold text-black dark:text-white uppercase tracking-wider mb-4">Topics</h3>
                  <ul className="text-xs text-zinc-500 dark:text-zinc-400 space-y-3 font-medium">
                    <li className="flex items-center gap-2"><span className="w-1 h-1 bg-brand rounded-full" /> Budgeting & Tax</li>
                    <li className="flex items-center gap-2"><span className="w-1 h-1 bg-brand rounded-full" /> Superannuation</li>
                    <li className="flex items-center gap-2"><span className="w-1 h-1 bg-brand rounded-full" /> Investing Basics</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="relative group reveal-up" style={{ animationDelay: '200ms' }}>
              <div className="bg-zinc-900 dark:bg-zinc-100 p-12 text-white dark:text-black shadow-2xl">
                <div className="w-12 h-1 bg-brand mb-8" />
                <h3 className="text-2xl font-bold uppercase tracking-tight leading-tight mb-8 italic">
                  "Empowering students with practical financial logic through academic-grade curriculum designed for the Australian context."
                </h3>
                <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-50">Caplet Institutional Vision</p>
              </div>
              <div className="absolute -bottom-6 -right-6 w-32 h-32 border border-brand/20 -z-10 group-hover:translate-x-2 group-hover:translate-y-2 transition-transform" />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-32 lg:py-48 page-section-light border-t border-zinc-100 dark:border-zinc-900">
        <div className="container-custom">
          <div className="max-w-3xl">
            <div className="mb-20">
              <p className="section-kicker">Help center</p>
              <h2 className="section-title">Support.</h2>
            </div>

            <div className="space-y-2">
              {faqData.map((item, index) => (
                <div
                  key={item.question}
                  className="group border border-zinc-100 dark:border-zinc-900 hover:border-brand transition-all overflow-hidden"
                >
                  <button
                    className="w-full px-8 py-8 text-left flex justify-between items-center outline-none"
                    onClick={() => toggleFaq(index)}
                  >
                    <span className="text-sm font-bold uppercase tracking-widest text-black dark:text-white group-hover:text-brand transition-colors">
                      {item.question}
                    </span>
                    <span className={`text-xl font-bold transition-transform duration-500 ${openFaq.has(index) ? 'rotate-45 text-brand' : 'text-zinc-300'}`}>
                      +
                    </span>
                  </button>
                  <div className={`grid transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1) ${openFaq.has(index) ? 'grid-rows-[1fr] opacity-100 pb-8' : 'grid-rows-[0fr] opacity-0'}`}>
                    <div className="overflow-hidden px-8">
                      <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed font-medium max-w-2xl">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Large Decorative Footer */}
      <section className="overflow-hidden py-40">
        <div className="container-custom">
          <h2 className="text-[18vw] font-extrabold text-zinc-400 dark:text-zinc-950 leading-none tracking-tighter select-none reveal-up">
            CAPLET.
          </h2>
        </div>
      </section>
    </div>
  );
};

export default Home;
