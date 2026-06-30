import '@testing-library/jest-dom';

// jsdom does not implement matchMedia. GSAP/ScrollTrigger and our own
// reduced-motion checks call it at import time, so provide a benign stub.
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}
