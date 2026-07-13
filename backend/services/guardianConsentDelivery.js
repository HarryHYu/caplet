class GuardianConsentDeliveryError extends Error {
  constructor(message, status = 503) {
    super(message);
    this.name = 'GuardianConsentDeliveryError';
    this.status = status;
  }
}

async function sendGuardianConsentEmail({ to, url, expiresAt }, options = {}) {
  const environment = options.environment || process.env.NODE_ENV || 'development';
  const apiKey = options.apiKey || process.env.RESEND_API_KEY;
  const from = options.from || process.env.GUARDIAN_CONSENT_FROM_EMAIL;
  const fetchImpl = options.fetchImpl || globalThis.fetch;

  // Local and automated environments expose the one-time URL so the flow can
  // be developed and verified without pretending that an email was delivered.
  if (environment !== 'production') {
    return { delivery: 'development_link', shareUrl: url, providerMessageId: null };
  }
  if (!apiKey || !from || typeof fetchImpl !== 'function') {
    throw new GuardianConsentDeliveryError('Guardian email delivery is not configured.');
  }

  const expiry = new Intl.DateTimeFormat('en-AU', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Australia/Sydney',
  }).format(new Date(expiresAt));
  const response = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: 'Review a Caplet guardian consent request',
      text: `A learner has asked you to review optional AI feedback, product analytics, and classroom participation in Caplet. Each feature also requires the learner’s own choice. Review the request at ${url}. This private, single-use link expires ${expiry}. If you did not expect this request, ignore this email.`,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    throw new GuardianConsentDeliveryError('Guardian email could not be delivered.');
  }
  const data = await response.json().catch(() => ({}));
  return { delivery: 'email', shareUrl: null, providerMessageId: data.id || null };
}

module.exports = { GuardianConsentDeliveryError, sendGuardianConsentEmail };
