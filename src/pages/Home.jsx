import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const FAQItem = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-line-soft last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="w-full py-8 flex justify-between items-center text-left group transition-all"
      >
        <span className="text-xl md:text-2xl font-serif italic text-text-primary group-hover:text-accent transition-colors">{question}</span>
        <span className={`flex-shrink-0 w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-300 ${isOpen ? 'rotate-180 bg-accent text-white border-transparent' : 'border-line-soft text-text-muted'}`}>
          <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
        </span>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96 pb-8' : 'max-h-0'}`}>
        <p className="text-lg text-text-muted font-display font-medium leading-relaxed max-w-3xl">
          {answer}
        </p>
      </div>
    </div>
  );
};

const Home = () => {
  const heroRef = useRef(null);
  const heroTextRef = useRef(null);
  const philosophyRef = useRef(null);
  const learningPathRef = useRef(null);
  const jargonRef = useRef(null);

  // Jargon Transformation Logic
  const [jargonIndex, setJargonIndex] = useState(0);
  const jargons = [
    { complex: "Amortization", plain: "Paying off a loan in regular chunks until it’s gone." },
    { complex: "Capital Gains", plain: "The profit you make when you sell something for more than you bought it." },
    { complex: "Compound Interest", plain: "Interest you earn on your original money, plus interest on the interest you've already earned." },
    { complex: "Franking Credits", plain: "A tax discount for shareholders to prevent the same money being taxed twice." },
    { complex: "Asset Allocation", plain: "Spreading your money across different things (like savings, property, or shares) to stay safe." },
    { complex: "Securities", plain: "A fancy word for tradable financial assets like stocks, bonds, or shares." }
  ];

  useEffect(() => {
    const jargonInterval = setInterval(() => {
      setJargonIndex(prev => (prev + 1) % jargons.length);
    }, 4000);
    return () => clearInterval(jargonInterval);
  }, []);

  // Card 1 Logic: Courses Shuffler
  const [courses, setCourses] = useState([
    "Budgeting Fundamentals",
    "Introduction to Data Science",
    "Digital Marketing 101",
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCourses(prev => {
        const newArr = [...prev];
        const last = newArr.pop();
        newArr.unshift(last);
        return newArr;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Card 2 Logic: Telemetry Typewriter
  const [typewriterText, setTypewriterText] = useState("");
  const messages = [
    "Generate slides from these notes...",
    "Build an interactive quiz...",
    "Summarise the key concepts here...",
    "Turn this PDF into a lesson...",
    "Create a structured lesson plan...",
  ];

  useEffect(() => {
    let msgIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let timeout;

    const type = () => {
      const currentMsg = messages[msgIndex];
      
      if (isDeleting) {
        setTypewriterText(currentMsg.substring(0, charIndex - 1));
        charIndex--;
      } else {
        setTypewriterText(currentMsg.substring(0, charIndex + 1));
        charIndex++;
      }

      if (!isDeleting && charIndex === currentMsg.length) {
        timeout = setTimeout(() => { isDeleting = true; type(); }, 2000);
      } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        msgIndex = (msgIndex + 1) % messages.length;
        timeout = setTimeout(type, 500);
      } else {
        timeout = setTimeout(type, isDeleting ? 30 : 70);
      }
    };

    timeout = setTimeout(type, 1000);
    return () => clearTimeout(timeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Card 3 Logic: Calculator Automation
  const [calcInput, setCalcInput] = useState("");
  const [calcOutput, setCalcOutput] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let activeInterval = null;

    const runAnimation = async () => {
      if (cancelled) return;
      setCalcInput("");
      setCalcOutput(0);

      const delay = (ms) => new Promise(r => setTimeout(r, ms));

      await delay(1000); if (cancelled) return;
      setCalcInput("$8");
      await delay(100); if (cancelled) return;
      setCalcInput("$85");
      await delay(100); if (cancelled) return;
      setCalcInput("$85,");
      await delay(100); if (cancelled) return;
      setCalcInput("$85,0");
      await delay(100); if (cancelled) return;
      setCalcInput("$85,000");

      await delay(500); if (cancelled) return;

      let value = 0;
      const target = 19667;
      activeInterval = setInterval(() => {
        if (cancelled) { clearInterval(activeInterval); return; }
        value += Math.floor(target / 20);
        if (value >= target) {
          setCalcOutput(target);
          clearInterval(activeInterval);
        } else {
          setCalcOutput(value);
        }
      }, 50);

      await delay(3000); if (cancelled) return;
      runAnimation();
    };

    runAnimation();

    return () => {
      cancelled = true;
      if (activeInterval) clearInterval(activeInterval);
    };
  }, []);

  // GSAP Animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero Animations
      gsap.fromTo('.hero-text-elem', 
        { y: 50, opacity: 0 }, 
        { y: 0, opacity: 1, duration: 1, stagger: 0.15, ease: 'power3.out', delay: 0.2 }
      );

      // Features Cards Reveal
      gsap.fromTo('.feature-card',
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.2,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '.feature-card',
            start: 'top 80%',
          }
        }
      );

      // Philosophy Scroll Trigger
      gsap.fromTo('.phil-text',
        { y: 100, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1.2,
          stagger: 0.2,
          ease: 'power4.out',
          scrollTrigger: {
            trigger: philosophyRef.current,
            start: 'top 70%',
          }
        }
      );

      // Learning Path Sticky Stacking
      const cards = gsap.utils.toArray('.learning-card');
      cards.forEach((card, i) => {
        if (i < cards.length - 1) {
          gsap.to(card, {
            scale: 0.9,
            opacity: 0.5,
            filter: 'blur(20px)',
            scrollTrigger: {
              trigger: cards[i + 1],
              start: 'top 70%',
              end: 'top top',
              scrub: true,
            }
          });
        }
      });

      // Jargon Reveal
      gsap.fromTo('.jargon-box',
        { scale: 0.8, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 1,
          ease: 'back.out(1.7)',
          scrollTrigger: {
            trigger: jargonRef.current,
            start: 'top 60%',
          }
        }
      );
    });

    return () => ctx.revert();
  }, []);

  return (
    <div className="bg-surface-body text-text-primary relative selection:bg-accent selection:text-text-contrast">
      {/* ================= SIMPLIFIED HERO ================= */}
      <section ref={heroRef} className="relative min-h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0 grid-technical opacity-40 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-surface-body pointer-events-none" />
        <div className="container-custom relative z-10 w-full text-center py-32" ref={heroTextRef}>
          <div className="max-w-4xl mx-auto text-text-primary">
            <h1 className="hero-text-elem text-5xl sm:text-6xl md:text-8xl lg:text-9xl font-display font-bold leading-[0.9] tracking-tighter mb-8">
              Anything,<br />
              <span className="font-serif italic font-medium text-accent-strong">Simplified.</span>
            </h1>
            <p className="hero-text-elem text-xl sm:text-2xl font-display font-medium max-w-2xl mx-auto text-text-muted leading-relaxed mb-12">
              An open platform for courses, tools, and anything you want to build and share.<br />
              No catch. No lock-in. Just powerful software.
            </p>
            <div className="hero-text-elem flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Link to="/register" className="bg-accent hover:bg-accent-strong text-white font-display font-semibold px-10 py-5 rounded-full transition-all duration-300 hover:scale-105 active:scale-95 shadow-xl w-full sm:w-auto text-center">
                Get Started Free
              </Link>
              <Link to="/courses" className="text-text-muted hover:text-text-primary font-display font-bold text-sm transition-all duration-300 group py-4 px-6 md:px-0">
                Browse Registry <span className="inline-block transition-transform group-hover:translate-x-1">&rarr;</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FEATURES (Card Dashboard) ================= */}
      <section className="py-24 md:py-40 bg-surface-soft relative z-20 overflow-hidden">
        <div className="container-custom">
          <div className="mb-16">
            <span className="text-xs font-mono font-bold text-accent mb-4 block">The Platform</span>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-text-primary">Everything you need to learn.</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Card 1: Knowledge Shuffler */}
            <div className="feature-card h-80 md:h-96 bg-surface-raised rounded-[2rem] p-8 shadow-sm border border-line-soft flex flex-col items-center justify-center relative overflow-hidden group">
              <div className="w-full flex justify-between absolute top-8 px-8">
                <span className="text-xs font-mono text-accent-strong/50">Knowledge Base</span>
                <span className="w-2 h-2 rounded-full bg-accent-strong/20" />
              </div>
              <div className="relative w-full h-32 mt-8 flex justify-center items-center">
                {courses.map((course, i) => (
                  <div 
                    key={course}
                    className="absolute w-full max-w-[280px] bg-surface-soft border border-line-soft rounded-2xl p-6 shadow-sm flex items-center justify-center text-center transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                    style={{
                      transform: `translateY(${i === 0 ? '0' : i === 1 ? '-16px' : '-32px'}) scale(${i === 0 ? 1 : i === 1 ? 0.95 : 0.9})`,
                      zIndex: courses.length - i,
                      opacity: i === 0 ? 1 : i === 1 ? 0.6 : 0.3
                    }}
                  >
                    <span className="font-serif italic text-xl text-text-primary">{course}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Card 2: AI Literarcy Assistant */}
            <div className="h-80 md:h-96 bg-surface-inverse text-text-contrast rounded-[2rem] p-8 shadow-sm border border-transparent dark:border-line-soft flex flex-col justify-between relative overflow-hidden group">
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono text-accent flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  AI Content Assistant
                </span>
              </div>
              <div className="flex-1 flex items-end pb-8">
                <p className="font-mono text-lg text-text-contrast/90 leading-tight">
                  <span className="text-accent mr-2">&gt;</span>
                  {typewriterText}
                  <span className="inline-block w-2 bg-accent h-5 animate-pulse ml-1 align-middle" />
                </p>
              </div>
              <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-surface-inverse via-transparent to-transparent opacity-50" />
            </div>

            {/* Card 3: Live Calculator Preview */}
            <div className="h-80 md:h-96 bg-surface-raised rounded-[2rem] p-8 shadow-sm border border-line-soft flex flex-col relative group">
              <div className="flex justify-between items-center mb-8">
                <span className="text-xs font-mono text-accent-strong/50">Live Telemetry</span>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="text-xs font-display font-medium text-text-dim mb-2 block">Income Input</label>
                  <div className="w-full bg-surface-soft rounded-xl px-4 py-3 font-mono text-text-primary border border-line-soft">
                    {calcInput || " "}
                  </div>
                </div>
                
                <div>
                  <label className="text-xs font-display font-medium text-text-dim mb-2 block">Est. Tax Outcome</label>
                  <div className="w-full bg-accent/10 rounded-xl px-4 py-3 font-mono text-accent border border-accent/20">
                    ${calcOutput.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="mt-auto pt-4 flex items-center gap-2 text-xs font-display font-bold text-accent-strong cursor-pointer hover:text-accent transition-colors">
                Try the full calculator &rarr;
              </div>

              {/* Fake SVG Cursor */}
              <div className="absolute w-8 h-8 pointer-events-none transition-all duration-1000 ease-in-out z-10" 
                   style={{ 
                     top: calcInput ? '30%' : '75%', 
                     left: calcInput ? '60%' : '20%',
                     opacity: 0.8 
                   }}>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 4L11.9616 22.396A1 1 0 0013.793 22.4542L16.2753 15.6558C16.3986 15.3178 16.6661 15.0503 17.0041 14.927L23.8024 12.4447A1 1 0 0023.7443 10.613L5.34825 2.65158" fill="var(--accent-strong)" />
                  <path d="M4 4L11.9616 22.396A1 1 0 0013.793 22.4542L16.2753 15.6558C16.3986 15.3178 16.6661 15.0503 17.0041 14.927L23.8024 12.4447A1 1 0 0023.7443 10.613L5.34825 2.65158L4 4Z" stroke="white" strokeWidth="2" strokeLinejoin="round" />
                </svg>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ================= JARGON TRANSFORMATION ================= */}
      <section ref={jargonRef} className="py-24 md:py-40 bg-surface-body relative overflow-hidden">
        <div className="container-custom">
          <div className="flex flex-col lg:flex-row items-center gap-16 md:gap-24">
            
            <div className="w-full lg:w-1/2">
              <span className="text-xs font-mono font-bold text-accent mb-8 block">The Knowledge Gap</span>
              <h2 className="text-4xl md:text-6xl font-display font-bold mb-8 leading-tight text-text-primary">
                We translate <br />
                <span className="font-serif italic text-accent-strong">any jargon</span> <br />
                into plain language.
              </h2>
              <p className="text-xl font-display font-medium text-text-muted leading-relaxed mb-12">
                Every field has language designed to confuse. Caplet makes the complex clear — whatever domain you're working in.
              </p>
            </div>

            <div className="w-full lg:w-1/2 relative bg-surface-raised rounded-[3rem] p-8 md:p-16 jargon-box shadow-2xl border border-line-soft min-h-[400px] flex flex-col justify-center transition-all duration-500 overflow-hidden">
              <div className="absolute top-0 right-0 p-8">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                  <span className="text-accent font-mono font-bold">{jargonIndex + 1}/{jargons.length}</span>
                </div>
              </div>

              <div className="relative h-full">
                {/* Complex side */}
                <div key={`complex-${jargons[jargonIndex].complex}`} className="animate-fade-slide-up">
                  <span className="text-xs font-mono text-text-dim/40 mb-2 block">Complex Terminology</span>
                  <h3 className="text-3xl md:text-5xl font-display font-bold text-text-primary mb-12">
                    {jargons[jargonIndex].complex}
                  </h3>
                </div>

                {/* Arrow animation divider */}
                <div className="w-full h-px bg-accent/20 mb-12 relative">
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-accent rounded-full animate-ping" />
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white shadow-lg">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>

                {/* Plain side */}
                <div key={`plain-${jargons[jargonIndex].complex}`} className="animate-fade-slide-up" style={{ animationDelay: '150ms' }}>
                  <span className="text-xs font-mono text-accent mb-2 block font-bold">In Plain English</span>
                  <p className="text-xl md:text-2xl font-serif italic text-accent-strong leading-relaxed">
                    "{jargons[jargonIndex].plain}"
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>
      <section ref={philosophyRef} className="py-32 md:py-48 bg-surface-soft text-text-primary relative overflow-hidden">
        <div className="container-custom relative z-10">
          <div className="max-w-5xl">
            <h2 className="text-4xl sm:text-6xl md:text-7xl font-display font-bold tracking-tight mb-12 leading-[1.2]">
              <span className="block overflow-hidden"><span className="phil-text block py-3">Most platforms profit from</span></span>
              <span className="block overflow-hidden"><span className="phil-text block py-3 font-serif italic text-accent-strong">your confusion.</span></span>
              <span className="block overflow-hidden mt-2"><span className="phil-text block py-3">We exist to end it.</span></span>
            </h2>
            
            <p className="phil-text text-lg sm:text-2xl font-display font-medium text-text-primary/80 max-w-3xl leading-relaxed">
              Caplet is free. Always. Build courses, tools, and workspaces for any subject, any audience, any purpose. No hidden costs, no upsells, no lock-in.
            </p>
          </div>
        </div>
      </section>

      {/* ================= LEARNING PATH ================= */}
      <section ref={learningPathRef} className="relative bg-surface-body pb-32">
        <div className="container-custom py-24">
          <div className="text-center mb-16">
            <span className="text-xs font-mono text-accent-strong/60 font-bold">The Syllabus</span>
            <h2 className="text-4xl md:text-5xl font-display font-bold mt-4">A structured path forward.</h2>
          </div>
        </div>

        {/* Path Cards */}
        <div className="w-full relative px-4 md:px-0">
          {[
            {
              title: "Build your workspace",
              kicker: "01. Structure",
              anim: "pie",
              desc: "Create courses, modules, and lessons from scratch. 15+ interactive slide types — text, quizzes, diagrams, embeds, timelines, Desmos graphs, and more."
            },
            {
              title: "Add intelligence",
              kicker: "02. Automate",
              anim: "timeline",
              desc: "Paste in notes, upload a PDF, or describe what you need. AI plans the structure in plain text first, then converts it to polished interactive slides — ready to publish."
            },
            {
              title: "Reach your audience",
              kicker: "03. Deliver",
              anim: "curve",
              desc: "Publish to the world or gate it behind a private classroom. Track progress, manage assignments, and iterate based on real usage."
            }
          ].map((item) => (
            <div key={item.kicker} className="learning-card sticky top-24 md:top-32 w-full max-w-6xl mx-auto h-[65vh] min-h-[500px] mb-24 rounded-[3rem] bg-surface-raised border border-line-soft shadow-2xl p-8 md:p-16 flex flex-col md:flex-row gap-12 items-center overflow-hidden transform-gpu">
              
              <div className="w-full md:w-1/2 relative z-10">
                <span className="text-xs font-mono font-bold text-accent-strong/60 block mb-4">
                  {item.kicker}
                </span>
                <h3 className="text-4xl md:text-5xl font-serif italic mb-6 text-text-primary">
                  {item.title}
                </h3>
                <p className="text-lg text-text-muted leading-relaxed font-display font-medium">
                  {item.desc}
                </p>
              </div>
              
              <div className="w-full md:w-1/2 h-full flex items-center justify-center bg-surface-soft rounded-[2rem] border border-line-soft relative overflow-hidden group">
                {/* Abstract Visuals depending on anim type */}
                {item.anim === 'pie' && (
                  <div className="relative w-64 h-64 rounded-full border-[16px] border-accent/20 border-t-accent border-r-accent-strong animate-spin transition-all duration-[10s]" />
                )}
                {item.anim === 'timeline' && (
                  <div className="w-3/4 h-2 bg-accent/20 rounded-full relative">
                    <div className="absolute top-1/2 -translate-y-1/2 left-0 w-4 h-4 rounded-full bg-accent shadow-[0_0_15px_rgba(0,80,255,0.5)]" />
                    <div className="absolute top-1/2 -translate-y-1/2 left-1/2 w-4 h-4 rounded-full bg-accent shadow-[0_0_15px_rgba(0,80,255,0.5)]" />
                    <div className="absolute top-1/2 -translate-y-1/2 right-0 w-4 h-4 rounded-full bg-accent-strong shadow-[0_0_15px_rgba(0,54,204,0.5)]" />
                  </div>
                )}
                {item.anim === 'curve' && (
                  <div className="relative w-full h-full p-8 flex items-end">
                    <svg viewBox="0 0 100 100" className="w-full h-full stroke-accent fill-none" preserveAspectRatio="none">
                      <path d="M0,100 C40,90 60,60 100,0" strokeWidth="4" strokeLinecap="round" />
                    </svg>
                    <span className="absolute top-12 right-12 font-mono text-2xl font-bold text-accent-strong">$124,500</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= FAQ ================= */}
      <section className="py-24 md:py-40 bg-surface-body border-t border-line-soft relative z-20">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <span className="text-xs font-mono text-accent font-bold mb-4 block">Common Questions</span>
              <h2 className="text-4xl md:text-5xl font-display font-bold text-text-primary">Still curious?</h2>
            </div>

            <div className="bg-surface-raised rounded-[3rem] px-8 md:px-12 py-4 shadow-sm border border-line-soft">
              {[
                {
                  q: "Is Caplet free?",
                  a: "Yes, completely free. Build and publish content, use the tools, and join classrooms — no credit card, no hidden costs, no upsells. Ever."
                },
                {
                  q: "What can I build on Caplet?",
                  a: "Structured courses with 15+ interactive slide types, calculator and tool suites, private classroom workspaces, and AI-generated content from notes or PDFs. Right now we focus on financial education, but the platform supports any subject or domain."
                },
                {
                  q: "Who is Caplet for?",
                  a: "Anyone who wants to create or consume structured interactive content — teachers, trainers, developers, creators, or learners. If you want to build something to share or learn from something well-made, Caplet is for you."
                },
                {
                  q: "How does the AI work?",
                  a: "Paste in notes, describe a topic, or upload a PDF. The AI first plans the lesson in plain natural text, then a second pass converts that plan into fully formatted interactive slides. You control the slide count, focus, and model."
                },
                {
                  q: "How do I get access to the lesson creator?",
                  a: "The lesson editor is gated by a workspace access code. Contact us through the contact form to request access and we'll get you set up."
                },
                {
                  q: "Can I suggest features or give feedback?",
                  a: "Absolutely. Use the contact form — we read everything and actively build based on what users actually need."
                },
                {
                  q: "How do I get started?",
                  a: "Create a free account and explore the existing curriculum, or head straight to the tools. If you want to build your own content, reach out for editor access."
                }
              ].map((faq, i) => (
                <FAQItem key={i} question={faq.q} answer={faq.a} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================= FOOTER CTA ================= */}
      <section className="bg-accent text-white py-32 rounded-t-[3rem] -mt-10 relative z-30">
        <div className="container-custom text-center max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-6xl font-serif italic mb-8">
            Ready to build something?
          </h2>
          <p className="text-xl md:text-2xl font-display font-medium text-white/80 mb-12">
            It&apos;s free. No catch.
          </p>
          <Link to="/courses" className="inline-block bg-surface-raised text-accent font-display font-bold px-10 py-5 rounded-full hover:scale-105 active:scale-95 transition-transform shadow-xl">
            Explore the platform
          </Link>
        </div>
      </section>

    </div>
  );
};

export default Home;
