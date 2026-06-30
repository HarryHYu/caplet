import { useEffect, useRef, useState } from 'react';

/**
 * Marker cursor for the homepage.
 *
 * A coral nib tracks the pointer tightly while a soft ring trails behind it
 * with easing; over interactive elements the ring tightens around the nib.
 * Disabled on touch devices and when the visitor prefers reduced motion (the
 * native cursor is used instead). Cleans up on unmount, so other pages keep
 * their normal cursor.
 */
const INTERACTIVE = 'a, button, [role="button"], [data-cursor], summary, label, input, select';

const MarkerCursor = () => {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const fine = window.matchMedia('(pointer: fine)').matches;
    const noMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (fine && !noMotion) setEnabled(true);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    const root = document.documentElement;
    root.classList.add('cursor-on');

    const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const ringPos = { ...mouse };
    let raf = 0;
    let started = false;

    const tick = () => {
      // Nib snaps to the pointer; ring eases toward it for a soft trail.
      ringPos.x += (mouse.x - ringPos.x) * 0.18;
      ringPos.y += (mouse.y - ringPos.y) * 0.18;
      dot.style.transform = `translate3d(${mouse.x}px, ${mouse.y}px, 0)`;
      ring.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0)`;
      raf = requestAnimationFrame(tick);
    };

    const onMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      if (!started) {
        started = true;
        ringPos.x = e.clientX;
        ringPos.y = e.clientY;
        dot.style.opacity = '1';
        ring.style.opacity = '';
      }
    };
    const setActive = (on) => (e) => {
      if (e.target.closest?.(INTERACTIVE)) {
        dot.classList.toggle('is-active', on);
        ring.classList.toggle('is-active', on);
      }
    };
    const onOver = setActive(true);
    const onOut = setActive(false);
    const press = (on) => () => {
      dot.classList.toggle('is-press', on);
      ring.classList.toggle('is-press', on);
    };
    const onDown = press(true);
    const onUp = press(false);
    const hide = () => { dot.style.opacity = '0'; ring.style.opacity = '0'; };
    const show = () => { if (started) { dot.style.opacity = '1'; ring.style.opacity = ''; } };

    window.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseover', onOver, true);
    document.addEventListener('mouseout', onOut, true);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    document.addEventListener('mouseleave', hide);
    document.addEventListener('mouseenter', show);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseover', onOver, true);
      document.removeEventListener('mouseout', onOut, true);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      document.removeEventListener('mouseleave', hide);
      document.removeEventListener('mouseenter', show);
      root.classList.remove('cursor-on');
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div className="marker-cursor" aria-hidden="true">
      <span ref={ringRef} className="mc-ring" />
      <span ref={dotRef} className="mc-dot" style={{ opacity: 0 }} />
    </div>
  );
};

export default MarkerCursor;
