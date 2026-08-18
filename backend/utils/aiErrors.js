function publicAIError(error, fallbackMessage) {
  const status = Number(error?.status);
  const message = String(error?.message || '');

  // Forward a 400/413 message ONLY when our own code explicitly marked it as
  // safe (`err.expose = true` at internal validation throw sites). Provider
  // SDK errors also carry 4xx statuses (OpenAI 400s include request/response
  // detail) and must never leak verbatim.
  if ((status === 400 || status === 413) && message && error?.expose === true) {
    return { status, message };
  }
  if (status === 503 && /not configured|not available|unavailable/i.test(message)) {
    return { status, message };
  }
  return { status: 502, message: fallbackMessage };
}

module.exports = { publicAIError };
