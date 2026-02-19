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
      'CapletEdu is specifically designed for integration into school curricula. We work directly with educators to develop structured lessons tailored to Australian students. Currently used by Knox Grammar School Commerce Department and Capital Finance Club.',
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
    const rotateX = (y - centerY) / 12;
    const rotateY = (centerX - x) / 12;

    setTilt({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  return (
    <div className="min-h-screen selection:bg-accent selection:text-white">
      {/* Hero Section */}
      <section className="pt-32 pb-40 md:pt-40 md:pb-56 relative overflow-hidden grid-technical">
        <div className="absolute inset-0 bg-gradient-to-b from-surface-body via-surface-body/80 to-surface-body pointer-events-none" />

        <div className="container-custom relative z-10">
          <div className="max-w-4xl mx-auto text-center reveal-text">
            <span className="section-kicker">Academic Standard ・ Australian Context</span>
            <h1 className="mb-12 text-balance">
              Financial logic for the <br />
              <span className="text-zinc-400 dark:text-zinc-800 italic font-serif font-light">next generation.</span>
            </h1>
            <p className="text-xl md:text-2xl text-text-muted mb-16 max-w-2xl mx-auto font-medium leading-relaxed">
              Bridging the literacy gap with professional, structured learning modules designed for school integration.
            </p>
            <div className="flex flex-col sm:flex-row gap-8 justify-center items-center">
              <Link to="/courses" className="btn-primary w-full sm:w-auto">
                Access Curriculum
              </Link>
              <Link to="/tools" className="btn-secondary w-full sm:w-auto">
                Financial Tools
              </Link>
            </div>
          </div>
        </div>

        {/* Floating Abstract Element */}
        <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-full max-w-5xl opacity-20 pointer-events-none">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-accent to-transparent" />
        </div>
      </section>

      {/* Trust Bar - Editorial Style */}
      <section className="py-16 border-y border-line-soft bg-surface-raised">
        <div className="container-custom">
          <div className="flex flex-col md:flex-row items-center justify-between gap-12 opacity-40 hover:opacity-100 transition-opacity duration-700">
            <div className="flex items-center gap-6">
              <img src={cfcLogo} alt="CFC" className="h-10 w-auto grayscale dark:invert" />
              <div className="h-8 w-px bg-line-soft hidden md:block" />
              <p className="text-[10px] font-bold uppercase tracking-widest max-w-[150px]">Capital Finance Club</p>
            </div>
            <div className="flex flex-wrap justify-center gap-12 text-[11px] font-bold uppercase tracking-[0.4em]">
              {['Structured', 'Standardised', 'Integrated'].map((label) => (
                <span key={label} className="flex items-center gap-3">
                  <span className="w-1.5 h-1.5 bg-accent" />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features - Asymmetric Layout */}
      <section className="py-40 lg:py-64">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-24 items-start">
            <div className="lg:col-span-5 reveal-text">
              <span className="section-kicker">The Edge</span>
              <h2 className="mb-12">Practical learning <br />over theory.</h2>
              <p className="text-lg text-text-muted leading-relaxed font-medium">
                We don't just teach definitions. We build systems that survive rent week, groceries, and long-term uncertainty.
              </p>
            </div>
            <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-px bg-line-soft border border-line-soft">
              {features.map((feature, index) => (
                <div key={feature.title} className="bg-surface-body p-12 transition-all duration-500 hover:bg-surface-raised group">
                  <span className="text-4xl font-serif italic text-accent/20 group-hover:text-accent transition-colors duration-500 mb-8 block">0{index + 1}</span>
                  <h3 className="text-xl font-bold uppercase tracking-tight mb-6">{feature.title}</h3>
                  <p className="text-sm text-text-muted leading-relaxed font-medium">{feature.text}</p>
                </div>
              ))}
              <div className="bg-accent p-12 text-white flex flex-col justify-between group cursor-pointer">
                <h3 className="text-xl font-bold uppercase tracking-tight">Join the network</h3>
                <div className="text-4xl font-serif italic self-end group-hover:translate-x-2 transition-transform">&rarr;</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Methodology - Technical Focus */}
      <section className="py-40 lg:py-64 bg-surface-inverse text-surface-body overflow-hidden relative">
        <div className="absolute inset-0 opacity-10 grid-technical !bg-[size:80px_80px]" />
        <div className="container-custom relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-32 items-center">
            <div>
              <span className="section-kicker !text-accent">Our Framework</span>
              <h2 className="text-surface-body mb-12">The Caplet <br /><span className="italic font-light font-serif">Axiom.</span></h2>
              <p className="text-zinc-400 text-xl font-medium leading-relaxed max-w-lg mb-16">
                A structured hierarchy of financial intelligence, from immediate survival to intergenerational strategy.
              </p>

              <div className="space-y-12">
                {[
                  { level: '01', title: 'Foundations', desc: 'Budgeting, Tax basics, Superannuation.' },
                  { level: '02', title: 'Strategy', desc: 'Investing, Risk management, Portfolio logic.' },
                  { level: '03', title: 'Legacy', desc: 'Estate planning, Business finance, Ethical capital.' }
                ].map((item) => (
                  <div key={item.level} className="flex gap-8 group">
                    <span className="text-xs font-bold text-accent tracking-widest mt-1">{item.level}</span>
                    <div>
                      <h4 className="text-lg font-bold uppercase tracking-widest mb-2 group-hover:text-accent transition-colors">{item.title}</h4>
                      <p className="text-sm text-zinc-500 font-medium">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative aspect-square reveal-text stagger-2">
              <div className="absolute inset-0 border border-zinc-800 rotate-45 scale-75 group-hover:rotate-90 transition-transform duration-1000" />
              <div className="absolute inset-0 border border-accent/30 -rotate-12 scale-90" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2/3 aspect-square bg-surface-raised p-1">
                  <div className="w-full h-full border border-zinc-200 p-12 flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-accent uppercase tracking-widest">Protocol alpha</span>
                    <h3 className="text-4xl font-serif italic text-black">Precision matters.</h3>
                    <div className="h-1 w-12 bg-accent" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Courses - Clean Editorial Cards */}
      <section className="py-40 lg:py-64">
        <div className="container-custom">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-12 mb-32">
            <div className="reveal-text">
              <span className="section-kicker">Curriculum</span>
              <h2 className="text-balance">Explore the <br />modules.</h2>
            </div>
            <Link to="/courses" className="btn-secondary">
              Full Library
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-line-soft border border-line-soft">
            {featuredCourses.length > 0 ? (
              featuredCourses.map((course, index) => (
                <Link
                  key={course.id}
                  to={`/courses/${course.id}`}
                  className="bg-surface-body p-12 group transition-all duration-700 hover:bg-surface-raised reveal-text"
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  <div className="flex justify-between items-start mb-16">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-accent border-b border-accent pb-1">
                      {course.level || 'L1'}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-text-dim">
                      {course.duration}m
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold uppercase tracking-tighter mb-8 group-hover:text-accent transition-colors duration-500">
                    {course.title}
                  </h3>
                  <p className="text-sm font-medium text-text-muted leading-relaxed line-clamp-3 mb-12">
                    {course.shortDescription}
                  </p>
                  <div className="text-[11px] font-bold uppercase tracking-[0.2em] transform group-hover:translate-x-2 transition-transform duration-500">
                    Enter Lesson &rarr;
                  </div>
                </Link>
              ))
            ) : (
              <div className="col-span-full py-40 text-center bg-surface-body">
                <p className="text-text-dim font-bold uppercase tracking-[0.4em] text-[10px] animate-pulse">Loading Academy...</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-40 lg:py-64 border-t border-line-soft relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full grid-technical opacity-20 pointer-events-none" />
        <div className="container-custom relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-32 items-start">
            <div className="reveal-text">
              <span className="section-kicker">Academic Trust</span>
              <h2 className="mb-12">Designed for <br />Educators.</h2>
              <p className="text-xl text-text-muted font-medium leading-relaxed mb-16">
                Caplet delivers structured financial education for Australian students, integrated into school curricula. Serving the Commerce Department for Years 9–10.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-line-soft border border-line-soft">
                <div className="bg-surface-body p-10">
                  <h3 className="text-xs font-bold uppercase tracking-widest mb-6 text-accent">Integration</h3>
                  <ul className="text-xs text-text-muted space-y-4 font-bold uppercase tracking-wider">
                    <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 bg-accent" /> Knox Grammar</li>
                    <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 bg-accent" /> Capital Finance</li>
                    <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 bg-accent" /> Live Deployment</li>
                  </ul>
                </div>
                <div className="bg-surface-body p-10">
                  <h3 className="text-xs font-bold uppercase tracking-widest mb-6 text-accent">Core Pillars</h3>
                  <ul className="text-xs text-text-muted space-y-4 font-bold uppercase tracking-wider">
                    <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 bg-accent" /> Compliance</li>
                    <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 bg-accent" /> Literacy</li>
                    <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 bg-accent" /> Application</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="lg:sticky lg:top-32 p-1 bg-text-primary reveal-text stagger-2">
              <div className="bg-surface-body p-12 lg:p-20 border border-zinc-200">
                <div className="w-12 h-px bg-accent mb-12" />
                <blockquote className="text-3xl lg:text-4xl font-serif italic leading-tight text-balance mb-12">
                  "Empowering the next generation with practical financial logic through academic-grade curriculum designed for the Australian context."
                </blockquote>
                <cite className="not-italic text-[10px] font-bold uppercase tracking-[0.4em] text-accent">
                  The Caplet Manifesto
                </cite>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ - Minimal & Precise */}
      <section className="py-40 border-t border-line-soft">
        <div className="container-custom">
          <div className="max-w-4xl">
            <span className="section-kicker">Help Desk</span>
            <h2 className="mb-24">General <br />Inquiry.</h2>

            <div className="space-y-px bg-line-soft">
              {faqData.map((item, index) => (
                <div key={item.question} className="bg-surface-body group">
                  <button
                    className="w-full px-0 py-10 text-left flex justify-between items-center outline-none group-hover:px-8 transition-all duration-500"
                    onClick={() => toggleFaq(index)}
                  >
                    <span className="text-sm font-bold uppercase tracking-[0.15em] text-text-primary group-hover:text-accent transition-colors">
                      {item.question}
                    </span>
                    <span className={`text-2xl font-light transition-transform duration-700 ${openFaq.has(index) ? 'rotate-45 text-accent' : 'text-zinc-300'}`}>
                      +
                    </span>
                  </button>
                  <div className={`grid transition-all duration-700 cubic-bezier(0.16, 1, 0.3, 1) ${openFaq.has(index) ? 'grid-rows-[1fr] opacity-100 pb-12' : 'grid-rows-[0fr] opacity-0'}`}>
                    <div className="overflow-hidden px-0 group-hover:px-8 transition-all duration-500">
                      <p className="text-text-muted text-[15px] leading-relaxed font-medium max-w-2xl border-l border-accent/20 pl-6">
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

      {/* Brand Signature */}
      <section className="py-64 overflow-hidden bg-surface-raised border-t border-line-soft">
        <div className="container-custom">
          <h2 className="text-[18vw] font-black leading-none tracking-ultra opacity-[0.03] select-none text-center">
            CAPLET.
          </h2>
        </div>
      </section>
    </div>
  );
};

export default Home;
