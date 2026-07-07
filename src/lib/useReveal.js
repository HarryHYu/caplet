import { useEffect } from 'react';
import gsap from 'gsap';

/**
 * Shared scroll-reveal for content pages.
 *
 * Add `reveal` to a block (fades + rises into view) or `reveal-stagger` to a
 * container (its direct children stagger in). Call `useReveal(ref)` once with a
 * ref on the page root, or `useReveal()` to scope to the whole document.
 *
 * The classes are plain markers with no hidden state in CSS, so if JS never
 * runs (or the visitor prefers reduced motion) everything is simply visible.
 *
 * This intentionally uses IntersectionObserver rather than GSAP ScrollTrigger.
 * ScrollTrigger only evaluates "is this element already past its trigger
 * point?" once, synchronously, at creation — on a page that's still settling
 * (fonts, async siblings shifting layout, or a Lenis/smooth-scroll setup that
 * doesn't emit native scroll events the same way) that single check can miss,
 * leaving the content stuck at its hidden "from" state forever, with no
 * further scroll ever re-checking it. IntersectionObserver has no such gap:
 * it always reports the element's real current visibility, immediately, and
 * keeps working no matter what's driving the scroll.
 */
function onceVisible(el, rootMargin, callback) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        callback();
        io.unobserve(entry.target);
      }
    });
  }, { rootMargin, threshold: 0 });
  io.observe(el);
  return io;
}

export function useReveal(scopeRef, deps = []) {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    const scope = scopeRef?.current || document;
    const observers = [];

    scope.querySelectorAll('.reveal').forEach((el) => {
      gsap.set(el, { y: 36, opacity: 0 });
      observers.push(onceVisible(el, '0px 0px -12% 0px', () => {
        gsap.to(el, { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out' });
      }));
    });

    scope.querySelectorAll('.reveal-stagger').forEach((group) => {
      gsap.set(group.children, { y: 28, opacity: 0 });
      observers.push(onceVisible(group, '0px 0px -15% 0px', () => {
        gsap.to(group.children, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out', stagger: 0.08 });
      }));
    });

    return () => observers.forEach((io) => io.disconnect());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export default useReveal;
