import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const FAQItem = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-black/5 last:border-0">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-8 flex justify-between items-center text-left group transition-all"
      >
        <span className="text-xl md:text-2xl font-serif italic text-caplet-ink group-hover:text-caplet-ocean transition-colors">{question}</span>
        <span className={`w-8 h-8 rounded-full border border-black/10 flex items-center justify-center transition-transform duration-300 ${isOpen ? 'rotate-180 bg-caplet-sky text-white' : ''}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
        </span>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96 pb-8' : 'max-h-0'}`}>
        <p className="text-lg text-caplet-ink/60 font-display font-medium leading-relaxed max-w-3xl">
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
    "Retirement Savings (Super) 101",
    "Budgeting Fundamentals",
    "Understanding Tax"
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
    "Breaking down your tax bracket...",
    "Explaining compound interest...",
    "What is a franking credit?",
    "Calculating your savings rate...",
    "Understanding HECS repayments..."
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
    const runAnimation = async () => {
      // Very basic mock of an automated calculator workflow
      setCalcInput("");
      setCalcOutput(0);
      
      await new Promise(r => setTimeout(r, 1000));
      setCalcInput("$8");
      await new Promise(r => setTimeout(r, 100));
      setCalcInput("$85");
      await new Promise(r => setTimeout(r, 100));
      setCalcInput("$85,");
      await new Promise(r => setTimeout(r, 100));
      setCalcInput("$85,0");
      await new Promise(r => setTimeout(r, 100));
      setCalcInput("$85,000");

      await new Promise(r => setTimeout(r, 500));
      
      // Animate counter
      let value = 0;
      const target = 19667; // approx tax
      const interval = setInterval(() => {
        value += Math.floor(target / 20);
        if (value >= target) {
          setCalcOutput(target);
          clearInterval(interval);
        } else {
          setCalcOutput(value);
        }
      }, 50);

      await new Promise(r => setTimeout(r, 3000));
      // Loop
      runAnimation();
    };

    runAnimation();
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
    <div className="bg-caplet-parchment text-caplet-ink relative selection:bg-caplet-sky selection:text-white">
      {/* ================= SIMPLIFIED HERO ================= */}
      <section ref={heroRef} className="relative pt-48 pb-24 md:pt-64 md:pb-40">
        <div className="container-custom relative z-10 w-full text-center" ref={heroTextRef}>
          <div className="max-w-4xl mx-auto text-caplet-ink">
            <h1 className="hero-text-elem text-5xl sm:text-6xl md:text-8xl lg:text-9xl font-display font-bold leading-[0.9] tracking-tighter mb-8">
              Money,<br />
              <span className="font-serif italic font-medium text-caplet-ocean">Simplified.</span>
            </h1>
            <p className="hero-text-elem text-xl sm:text-2xl font-display font-medium max-w-2xl mx-auto text-caplet-ink/60 leading-relaxed mb-12">
              Structured financial education for Australians.<br />
              No products. No catch. Just clarity.
            </p>
            <div className="hero-text-elem flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Link to="/login" className="bg-caplet-sky hover:bg-blue-700 text-white font-display font-semibold px-10 py-5 rounded-full transition-all duration-300 hover:scale-105 active:scale-95 shadow-xl w-full sm:w-auto text-center">
                Get Started Free
              </Link>
              <Link to="/courses" className="text-caplet-ink/60 hover:text-caplet-ink font-display font-bold text-sm uppercase tracking-widest transition-all duration-300 group py-4 px-6 md:px-0">
                Browse Registry <span className="inline-block transition-transform group-hover:translate-x-1">&rarr;</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FEATURES (Card Dashboard) ================= */}
      <section className="py-24 md:py-40 bg-caplet-parchment relative z-20 overflow-hidden">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Card 1: Knowledge Shuffler */}
            <div className="feature-card h-80 md:h-96 bg-white rounded-[2rem] p-8 shadow-sm border border-black/5 flex flex-col items-center justify-center relative overflow-hidden group">
              <div className="w-full flex justify-between absolute top-8 px-8">
                <span className="text-xs font-mono tracking-widest text-caplet-ocean/50 uppercase">Knowledge Base</span>
                <span className="w-2 h-2 rounded-full bg-caplet-ocean/20" />
              </div>
              <div className="relative w-full h-32 mt-8 flex justify-center items-center">
                {courses.map((course, i) => (
                  <div 
                    key={course}
                    className="absolute w-full max-w-[280px] bg-caplet-parchment border border-black/5 rounded-2xl p-6 shadow-sm flex items-center justify-center text-center transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                    style={{
                      transform: `translateY(${i === 0 ? '0' : i === 1 ? '-16px' : '-32px'}) scale(${i === 0 ? 1 : i === 1 ? 0.95 : 0.9})`,
                      zIndex: courses.length - i,
                      opacity: i === 0 ? 1 : i === 1 ? 0.6 : 0.3
                    }}
                  >
                    <span className="font-serif italic text-xl text-caplet-ink">{course}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Card 2: AI Literarcy Assistant */}
            <div className="h-80 md:h-96 bg-caplet-ink text-caplet-parchment rounded-[2rem] p-8 shadow-sm flex flex-col justify-between relative overflow-hidden group">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono tracking-widest text-caplet-sky uppercase flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-caplet-sky animate-pulse" />
                  AI Assistant — Educational Only
                </span>
              </div>
              <div className="flex-1 flex items-end pb-8">
                <p className="font-mono text-lg text-caplet-parchment/90 leading-tight">
                  <span className="text-caplet-sky mr-2">&gt;</span>
                  {typewriterText}
                  <span className="inline-block w-2 bg-caplet-sky h-5 animate-pulse ml-1 align-middle" />
                </p>
              </div>
              <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-caplet-ink via-transparent to-transparent opacity-50" />
            </div>

            {/* Card 3: Live Calculator Preview */}
            <div className="h-80 md:h-96 bg-white rounded-[2rem] p-8 shadow-sm border border-black/5 flex flex-col relative group">
              <div className="flex justify-between items-center mb-8">
                <span className="text-[10px] font-mono tracking-widest text-caplet-ocean/50 uppercase">Live Telemetry</span>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="text-xs font-display font-medium text-caplet-ink/50 uppercase tracking-widest mb-2 block">Income Input</label>
                  <div className="w-full bg-caplet-parchment rounded-xl px-4 py-3 font-mono text-caplet-ink border border-black/5">
                    {calcInput || " "}
                  </div>
                </div>
                
                <div>
                  <label className="text-xs font-display font-medium text-caplet-ink/50 uppercase tracking-widest mb-2 block">Est. Tax Outcome</label>
                  <div className="w-full bg-caplet-sky/10 rounded-xl px-4 py-3 font-mono text-caplet-sky border border-caplet-sky/20">
                    ${calcOutput.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="mt-auto pt-4 flex items-center gap-2 text-xs font-display font-bold text-caplet-ocean cursor-pointer hover:text-caplet-sky transition-colors">
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
                  <path d="M4 4L11.9616 22.396A1 1 0 0013.793 22.4542L16.2753 15.6558C16.3986 15.3178 16.6661 15.0503 17.0041 14.927L23.8024 12.4447A1 1 0 0023.7443 10.613L5.34825 2.65158" fill="#1B3F6B" />
                  <path d="M4 4L11.9616 22.396A1 1 0 0013.793 22.4542L16.2753 15.6558C16.3986 15.3178 16.6661 15.0503 17.0041 14.927L23.8024 12.4447A1 1 0 0023.7443 10.613L5.34825 2.65158L4 4Z" stroke="white" strokeWidth="2" strokeLinejoin="round" />
                </svg>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ================= JARGON TRANSFORMATION ================= */}
      <section ref={jargonRef} className="py-24 md:py-40 bg-white relative overflow-hidden">
        <div className="container-custom">
          <div className="flex flex-col lg:flex-row items-center gap-16 md:gap-24">
            
            <div className="w-full lg:w-1/2">
              <span className="text-xs font-mono font-bold tracking-[0.3em] text-caplet-sky uppercase mb-8 block">The Language Gap</span>
              <h2 className="text-4xl md:text-6xl font-display font-bold mb-8 leading-tight text-caplet-ink">
                We translate <br />
                <span className="font-serif italic text-caplet-ocean">Industry Jargon</span> <br />
                into Plain English.
              </h2>
              <p className="text-xl font-display font-medium text-caplet-ink/60 leading-relaxed mb-12">
                Finance is intentionally complex. We strip away the smoke and mirrors to give you the definitions that actually matter for your future.
              </p>
            </div>

            <div className="w-full lg:w-1/2 relative bg-caplet-parchment rounded-[3rem] p-8 md:p-16 jargon-box shadow-2xl border border-black/5 min-h-[400px] flex flex-col justify-center transition-all duration-500 overflow-hidden">
              <div className="absolute top-0 right-0 p-8">
                <div className="w-12 h-12 rounded-full bg-caplet-sky/10 flex items-center justify-center">
                  <span className="text-caplet-sky font-mono font-bold">{jargonIndex + 1}/{jargons.length}</span>
                </div>
              </div>

              <div className="relative h-full">
                {/* Complex side */}
                <div key={`complex-${jargons[jargonIndex].complex}`} className="animate-fade-slide-up">
                  <span className="text-[10px] uppercase tracking-widest font-mono text-caplet-ink/30 mb-2 block">Complex Terminology</span>
                  <h3 className="text-3xl md:text-5xl font-display font-bold text-caplet-ink mb-12">
                    {jargons[jargonIndex].complex}
                  </h3>
                </div>

                {/* Arrow animation divider */}
                <div className="w-full h-px bg-caplet-sky/20 mb-12 relative">
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-caplet-sky rounded-full animate-ping" />
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-8 h-8 rounded-full bg-caplet-sky flex items-center justify-center text-white shadow-lg">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>

                {/* Plain side */}
                <div key={`plain-${jargons[jargonIndex].complex}`} className="animate-fade-slide-up" style={{ animationDelay: '150ms' }}>
                  <span className="text-[10px] uppercase tracking-widest font-mono text-caplet-sky mb-2 block font-bold">In Plain English</span>
                  <p className="text-xl md:text-2xl font-serif italic text-caplet-ocean leading-relaxed">
                    "{jargons[jargonIndex].plain}"
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>
      <section ref={philosophyRef} className="py-32 md:py-48 bg-caplet-sand text-caplet-ink relative overflow-hidden">
        <div className="container-custom relative z-10">
          <div className="max-w-5xl">
            <h2 className="text-4xl sm:text-6xl md:text-7xl font-display font-bold tracking-tight mb-12 leading-[1.2]">
              <span className="block overflow-hidden"><span className="phil-text block py-3">Most platforms profit from</span></span>
              <span className="block overflow-hidden"><span className="phil-text block py-3 font-serif italic text-caplet-ocean">your confusion.</span></span>
              <span className="block overflow-hidden mt-2"><span className="phil-text block py-3">We exist to end it.</span></span>
            </h2>
            
            <p className="phil-text text-lg sm:text-2xl font-display font-medium text-caplet-ink/80 max-w-3xl leading-relaxed">
              Caplet is free. Always. No products. No upsells. No affiliate links buried in our content. Just structured financial education, built for Australians who deserve better.
            </p>
          </div>
        </div>
      </section>

      {/* ================= LEARNING PATH ================= */}
      <section ref={learningPathRef} className="relative bg-caplet-parchment pb-32">
        <div className="container-custom py-24">
          <div className="text-center mb-16">
            <span className="uppercase text-xs font-mono tracking-widest text-caplet-ocean/60 font-bold">The Syllabus</span>
            <h2 className="text-4xl md:text-5xl font-display font-bold mt-4">A structured path forward.</h2>
          </div>
        </div>

        {/* Path Cards */}
        <div className="w-full relative px-4 md:px-0">
          {[
            {
              title: "Understanding Your Money",
              kicker: "01. Foundations",
              anim: "pie",
              desc: "Build a rock-solid mental model of your cash flow. We demystify budgeting by focusing on systems, not restrictive rules."
            },
            {
              title: "Tax, Super & Beyond",
              kicker: "02. Building Knowledge",
              anim: "timeline",
              desc: "Navigate the Australian system. Finally understand what your payslip means, where your tax goes, and why your super balance matters today."
            },
            {
              title: "Put It Into Practice",
              kicker: "03. Taking Action",
              anim: "curve",
              desc: "From theory to reality. Learn how compound interest, risk profiles, and long-term planning translate into actual wealth creation."
            }
          ].map((item, index) => (
            <div key={item.kicker} className="learning-card sticky top-24 md:top-32 w-full max-w-6xl mx-auto h-[65vh] min-h-[500px] mb-24 rounded-[3rem] bg-white border border-black/5 shadow-2xl p-8 md:p-16 flex flex-col md:flex-row gap-12 items-center overflow-hidden transform-gpu">
              
              <div className="w-full md:w-1/2 relative z-10">
                <span className="text-xs font-mono font-bold tracking-widest text-caplet-ocean/60 uppercase block mb-4">
                  {item.kicker}
                </span>
                <h3 className="text-4xl md:text-5xl font-serif italic mb-6 text-caplet-ink">
                  {item.title}
                </h3>
                <p className="text-lg text-caplet-ink/70 leading-relaxed font-display font-medium">
                  {item.desc}
                </p>
              </div>
              
              <div className="w-full md:w-1/2 h-full flex items-center justify-center bg-caplet-parchment rounded-[2rem] border border-black/5 relative overflow-hidden group">
                {/* Abstract Visuals depending on anim type */}
                {item.anim === 'pie' && (
                  <div className="relative w-64 h-64 rounded-full border-[16px] border-caplet-sky/20 border-t-caplet-sky border-r-caplet-ocean animate-spin transition-all duration-[10s]" />
                )}
                {item.anim === 'timeline' && (
                  <div className="w-3/4 h-2 bg-caplet-sky/20 rounded-full relative">
                    <div className="absolute top-1/2 -translate-y-1/2 left-0 w-4 h-4 rounded-full bg-caplet-sky shadow-[0_0_15px_rgba(37,99,235,0.5)]" />
                    <div className="absolute top-1/2 -translate-y-1/2 left-1/2 w-4 h-4 rounded-full bg-caplet-sky shadow-[0_0_15px_rgba(37,99,235,0.5)]" />
                    <div className="absolute top-1/2 -translate-y-1/2 right-0 w-4 h-4 rounded-full bg-caplet-ocean shadow-[0_0_15px_rgba(27,63,107,0.5)]" />
                  </div>
                )}
                {item.anim === 'curve' && (
                  <div className="relative w-full h-full p-8 flex items-end">
                    <svg viewBox="0 0 100 100" className="w-full h-full stroke-caplet-sky fill-none" preserveAspectRatio="none">
                      <path d="M0,100 C40,90 60,60 100,0" strokeWidth="4" strokeLinecap="round" />
                    </svg>
                    <span className="absolute top-12 right-12 font-mono text-2xl font-bold text-caplet-ocean">$124,500</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= FAQ ================= */}
      <section className="py-24 md:py-40 bg-caplet-parchment border-t border-black/5 relative z-20">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <span className="uppercase text-xs font-mono tracking-[0.3em] text-caplet-sky font-bold mb-4 block">Common Questions</span>
              <h2 className="text-4xl md:text-5xl font-display font-bold text-caplet-ink">Still curious?</h2>
            </div>

            <div className="bg-white rounded-[3rem] px-8 md:px-12 py-4 shadow-sm border border-black/5">
              {[
                { 
                  q: "Is Caplet really free?", 
                  a: "Yes, 100%. We believe financial literacy is a fundamental right. Caplet is funded independently, and we never sell your data or push affiliate financial products." 
                },
                { 
                  q: "Is this financial advice?", 
                  a: "Absolutely not. Caplet provide strictly educational material. We help you understand how the system works so you can make your own informed decisions or ask the right questions when talking to a professional." 
                },
                { 
                  q: "Do I need to live in Australia?", 
                  a: "Our content is deeply optimized for the Australian system (retirement savings, tax brackets, HELP/HECS, etc.), but the core principles of cash flow and compound interest apply to everyone." 
                },
                { 
                  q: "How often courses updated?", 
                  a: "Whenever policy changes (like new tax thresholds or super guarantee changes), we update the curriculum within 48 hours to ensure you're learning from the latest data." 
                },
                {
                  q: "Where are the sources gathered from?",
                  a: "Our courses and information are all verified and tightly linked to the NESA syllabus for schools, including Year 9 to 10 Commerce with its corresponding legal, economics and business topics."
                },
                {
                  q: "Can I suggest courses and give feedback to Caplet?",
                  a: "Yes, absolutely! We love hearing from our users. You can suggest new course topics or provide feedback on existing ones through our contact form."
                },
                {
                  q: "How do I get started?",
                  a: "Just click on any course that interests you, sign up for a free account, and you'll be able to start learning immediately."
                }
              ].map((faq, i) => (
                <FAQItem key={i} question={faq.q} answer={faq.a} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================= FOOTER CTA ================= */}
      <section className="bg-caplet-sky text-white py-32 rounded-t-[3rem] -mt-10 relative z-30">
        <div className="container-custom text-center max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-6xl font-serif italic mb-8">
            Ready to actually understand your money?
          </h2>
          <p className="text-xl md:text-2xl font-display font-medium text-white/80 mb-12">
            Start with any course! it's free.
          </p>
          <Link to="/courses" className="inline-block bg-white text-caplet-sky font-display font-bold px-10 py-5 rounded-full hover:scale-105 active:scale-95 transition-transform shadow-xl">
            View Curriculum
          </Link>
        </div>
      </section>

    </div>
  );
};

export default Home;
