import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Shared scroll-reveal for content pages.
 *
 * Add `reveal` to a block (fades + rises into view) or `reveal-stagger` to a
 * container (its direct children stagger in). Call `useReveal(ref)` once with a
 * ref on the page root, or `useReveal()` to scope to the whole document.
 *
 * The classes are plain markers with no hidden state in CSS, so if JS never
 * runs (or the visitor prefers reduced motion) everything is simply visible.
 */
export function useReveal(scopeRef, deps = []) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    const scope = scopeRef?.current || undefined;
    const ctx = gsap.context(() => {
      gsap.utils.toArray('.reveal').forEach((el) => {
        gsap.from(el, {
          y: 36,
          opacity: 0,
          duration: 0.7,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 88%' },
        });
      });
      gsap.utils.toArray('.reveal-stagger').forEach((group) => {
        gsap.from(group.children, {
          y: 28,
          opacity: 0,
          duration: 0.6,
          ease: 'power3.out',
          stagger: 0.08,
          scrollTrigger: { trigger: group, start: 'top 85%' },
        });
      });
    }, scope);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export default useReveal;
