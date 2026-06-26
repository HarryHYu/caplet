// Procedural per-district ambient music (Web Audio, no asset files). Each
// district gets a slow evolving pad — a few detuned oscillators (root + fifth +
// octave) through a low-pass filter with a gentle LFO shimmer. Switching
// districts crossfades from the old voice to the new one. The AudioContext is
// created lazily and resumed on the first user gesture (autoplay policy).
import { useEffect, useRef } from 'react';
import { DISTRICT_META } from './cityWorld.js';

const MASTER = 0.14;        // overall volume (kept low — it's ambience)
const FADE = 1.4;           // crossfade time constant (s)

function makeVoice(ctx, pad, dest) {
  const vGain = ctx.createGain();
  vGain.gain.value = 0;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = pad.cutoff;
  filter.Q.value = 0.8;
  filter.connect(vGain);
  vGain.connect(dest);

  const oscs = [1, 1.5, 2].map((mult, i) => {
    const o = ctx.createOscillator();
    o.type = pad.type;
    o.frequency.value = pad.root * mult;
    o.detune.value = (i - 1) * pad.detune;
    o.connect(filter);
    o.start();
    return o;
  });

  // Slow shimmer: an LFO wobbling the filter cutoff so the pad breathes.
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.05 + Math.random() * 0.06;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = pad.cutoff * 0.22;
  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);
  lfo.start();

  return { vGain, oscs, lfo };
}

function stopVoice(voice, ctx, when) {
  voice.vGain.gain.cancelScheduledValues(ctx.currentTime);
  voice.vGain.gain.setTargetAtTime(0, ctx.currentTime, FADE / 2);
  const t = ctx.currentTime + when;
  voice.oscs.forEach((o) => { try { o.stop(t); } catch { /* already stopped */ } });
  try { voice.lfo.stop(t); } catch { /* already stopped */ }
}

export function useDistrictAudio(districtKey, enabled) {
  const ctxRef = useRef(null);
  const masterRef = useRef(null);
  const voiceRef = useRef(null);

  // Create / resume the context once enabled, on a user gesture.
  useEffect(() => {
    if (!enabled) return undefined;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return undefined;
    if (!ctxRef.current) {
      const ctx = new AC();
      const master = ctx.createGain();
      master.gain.value = MASTER;
      master.connect(ctx.destination);
      ctxRef.current = ctx;
      masterRef.current = master;
    }
    const resume = () => { ctxRef.current?.resume?.(); };
    resume();
    window.addEventListener('pointerdown', resume);
    window.addEventListener('keydown', resume);
    return () => {
      window.removeEventListener('pointerdown', resume);
      window.removeEventListener('keydown', resume);
    };
  }, [enabled]);

  // Crossfade to the current district's voice whenever it changes.
  useEffect(() => {
    const ctx = ctxRef.current;
    const master = masterRef.current;
    if (!enabled || !ctx || !master) return undefined;
    const meta = DISTRICT_META[districtKey] || DISTRICT_META.centre;
    if (voiceRef.current) stopVoice(voiceRef.current, ctx, FADE * 2);
    const voice = makeVoice(ctx, meta.pad, master);
    voice.vGain.gain.setTargetAtTime(1, ctx.currentTime, FADE);
    voiceRef.current = voice;
    return undefined;
  }, [districtKey, enabled]);

  // Tear down completely when audio is disabled (leaving play mode) / unmount.
  useEffect(() => {
    if (enabled) return undefined;
    return () => {};
  }, [enabled]);

  useEffect(() => () => {
    const ctx = ctxRef.current;
    if (ctx) { try { ctx.close(); } catch { /* noop */ } ctxRef.current = null; }
  }, []);
}
