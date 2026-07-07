import { useEffect } from 'react';
import gsap from 'gsap';

/**
 * Reveals `targets` on scroll: fades/rises (or whatever `fromVars`/`toVars`
 * describe) into place once `trigger` first comes on screen.
 *
 * Anything already on screen when this runs is shown as-is, immediately, with
 * no animation — only content that's genuinely still below the fold animates
 * in as the visitor scrolls to it (via IntersectionObserver, which — unlike
 * GSAP ScrollTrigger's own toggle system — can't miss and get stuck at its
 * hidden "from" state forever; ScrollTrigger only checks "is this already
 * past its trigger point?" once, synchronously, at creation, which can race
 * with a page that's still settling its layout).
 *
 * Push the returned observer onto a registry array and `disconnect()` each
 * one on cleanup.
 */
export function revealOnScroll(trigger, targets, fromVars, toVars, rootMargin, observers) {
  if (trigger.getBoundingClientRect().top < window.innerHeight) {
    gsap.set(targets, toVars);
    return;
  }
  gsap.set(targets, fromVars);
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        gsap.to(targets, toVars);
        io.unobserve(entry.target);
      }
    });
  }, { rootMargin, threshold: 0 });
  io.observe(trigger);
  observers.push(io);
}

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
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    const scope = scopeRef?.current || document;
    const observers = [];

    scope.querySelectorAll('.reveal').forEach((el) => {
      revealOnScroll(el, el, { y: 36, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out' }, '0px 0px -12% 0px', observers);
    });

    scope.querySelectorAll('.reveal-stagger').forEach((group) => {
      revealOnScroll(group, group.children, { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out', stagger: 0.08 }, '0px 0px -15% 0px', observers);
    });

    return () => observers.forEach((io) => io.disconnect());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export default useReveal;
