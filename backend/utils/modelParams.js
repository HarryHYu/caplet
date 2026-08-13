/**
 * Sampling parameters for a chat completion.
 *
 * The gpt-5 family and the o-series reasoning models reject ANY non-default
 * `temperature` with a 400 — "Unsupported value: 'temperature' does not
 * support 0.4 with this model. Only the default (1) value is supported." A
 * per-service `startsWith('o') || model === 'gpt-5'` check missed every
 * dotted id (gpt-5.4-mini, gpt-5.4, gpt-5.5), so those calls failed outright
 * or silently degraded to a fallback.
 *
 * The allowlist is deliberately inverted: temperature is sent ONLY for model
 * families known to accept it. Omitting it is always valid; sending it to a
 * model that refuses it fails the whole request.
 */
function supportsTemperature(model) {
  const id = String(model || '').trim().toLowerCase();
  if (!id) return false;
  if (id.startsWith('o')) return false; // o1 / o3 / o4 reasoning models
  if (/^gpt-5(?:\D|$)/.test(id)) return false; // gpt-5, gpt-5.4, gpt-5.4-mini, gpt-5.5, …
  return /^gpt-[34]/.test(id); // known-good legacy families only
}

/** Spread into a create() call: `...samplingParams(model, 0.4)`. */
function samplingParams(model, temperature) {
  if (typeof temperature !== 'number' || !supportsTemperature(model)) return {};
  return { temperature };
}

module.exports = { supportsTemperature, samplingParams };
