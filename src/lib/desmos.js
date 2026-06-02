/**
 * Lazy Desmos API loader.
 *
 * Loads the Desmos JS API script once on first call and caches the promise,
 * so subsequent calls resolve immediately with window.Desmos.
 *
 * The API key is read from VITE_DESMOS_API_KEY (falls back to the official
 * demo key which Desmos provides for development).
 */

const DEMO_KEY = 'dcb31709b452b1cf9dc26972add0fda6';
const API_KEY = import.meta.env.VITE_DESMOS_API_KEY || DEMO_KEY;
const DESMOS_VERSION = '1.9';

let loadPromise = null;

export function loadDesmos() {
  // If already resolved (window.Desmos available), return immediately.
  if (window.Desmos) return Promise.resolve(window.Desmos);
  // Reuse an in-flight or successfully-resolved promise.
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://www.desmos.com/api/v${DESMOS_VERSION}/calculator.js?apiKey=${API_KEY}`;
    script.async = true;
    script.onload = () => {
      if (window.Desmos) resolve(window.Desmos);
      else reject(new Error('Desmos API loaded but window.Desmos is undefined'));
    };
    script.onerror = () => {
      loadPromise = null; // allow retry on next call
      reject(new Error('Failed to load Desmos API script'));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}
