/**
 * Typewriter tycoon sounds — synthesized with WebAudio, no audio assets.
 * Tiny, dry, mechanical: a clack per landed word, a bell ding for paragraph
 * finishes and carriage returns, a coin blip for money moments, a rubbery
 * boing when a sabotage lands on you. One master mute, persisted.
 *
 * The AudioContext is created lazily on the first play() after a user
 * gesture (browsers block earlier), and every voice is a few oscillator/
 * noise nodes with fast envelopes — nothing sustained, nothing loud.
 */

const MUTE_KEY = 'caplet:tycoon-muted';

let ctx = null;
let muted = null;

function isMuted() {
    if (muted === null) {
        try { muted = localStorage.getItem(MUTE_KEY) === '1'; } catch { muted = false; }
    }
    return muted;
}

export function setMuted(next) {
    muted = !!next;
    try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch { /* fine */ }
}

export function getMuted() { return isMuted(); }

function audio() {
    if (ctx) return ctx;
    try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
    } catch { return null; }
    return ctx;
}

function env(gainNode, t, peak, decay) {
    gainNode.gain.setValueAtTime(0.0001, t);
    gainNode.gain.exponentialRampToValueAtTime(peak, t + 0.004);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, t + decay);
}

function tone(a, { type = 'sine', from = 440, to = null, peak = 0.08, decay = 0.12, at = 0 }) {
    const t = a.currentTime + at;
    const osc = a.createOscillator();
    const gain = a.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, t + decay);
    env(gain, t, peak, decay);
    osc.connect(gain).connect(a.destination);
    osc.start(t);
    osc.stop(t + decay + 0.05);
}

function noise(a, { peak = 0.06, decay = 0.05, highpass = 1800, at = 0 }) {
    const t = a.currentTime + at;
    const length = Math.max(1, Math.floor(a.sampleRate * (decay + 0.02)));
    const buffer = a.createBuffer(1, length, a.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    const src = a.createBufferSource();
    src.buffer = buffer;
    const filter = a.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = highpass;
    const gain = a.createGain();
    env(gain, t, peak, decay);
    src.connect(filter).connect(gain).connect(a.destination);
    src.start(t);
}

const VOICES = {
    // The key strike: a dry mechanical clack.
    clack(a) {
        noise(a, { peak: 0.05, decay: 0.035, highpass: 2400 });
        tone(a, { type: 'square', from: 190, peak: 0.02, decay: 0.03 });
    },
    // Carriage-return / paragraph bell.
    ding(a) {
        tone(a, { type: 'sine', from: 1560, peak: 0.06, decay: 0.5 });
        tone(a, { type: 'sine', from: 2340, peak: 0.02, decay: 0.35 });
    },
    // Money: a two-note coin blip.
    coin(a) {
        tone(a, { type: 'triangle', from: 990, peak: 0.05, decay: 0.07 });
        tone(a, { type: 'triangle', from: 1320, peak: 0.05, decay: 0.12, at: 0.06 });
    },
    // A crit jackpot: the coin, up an octave, with a shimmer.
    jackpot(a) {
        tone(a, { type: 'triangle', from: 1320, peak: 0.06, decay: 0.08 });
        tone(a, { type: 'triangle', from: 1760, peak: 0.06, decay: 0.1, at: 0.07 });
        tone(a, { type: 'sine', from: 2640, peak: 0.03, decay: 0.3, at: 0.14 });
    },
    // You bought something.
    kaching(a) {
        noise(a, { peak: 0.03, decay: 0.04, highpass: 3200 });
        tone(a, { type: 'triangle', from: 660, to: 990, peak: 0.06, decay: 0.16 });
    },
    // A sabotage landed on you: rubbery descending boing.
    boing(a) {
        tone(a, { type: 'sine', from: 520, to: 130, peak: 0.09, decay: 0.35 });
        tone(a, { type: 'sine', from: 780, to: 195, peak: 0.04, decay: 0.3, at: 0.02 });
    },
    // Your defence ate a hit.
    thunk(a) {
        noise(a, { peak: 0.05, decay: 0.08, highpass: 500 });
        tone(a, { type: 'sine', from: 240, to: 180, peak: 0.06, decay: 0.14 });
    },
};

/** Play a named voice; silently does nothing when muted or unsupported. */
export function play(name) {
    if (isMuted()) return;
    const a = audio();
    if (!a || !VOICES[name]) return;
    if (a.state === 'suspended') a.resume().catch(() => {});
    try { VOICES[name](a); } catch { /* audio is never worth crashing over */ }
}
