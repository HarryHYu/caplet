class PasswordResetDeliveryError extends Error {
  constructor(message, status = 503) {
    super(message);
    this.name = 'PasswordResetDeliveryError';
    this.status = status;
  }
}

const developmentLinks = new Map();

async function sendPasswordResetEmail({ to, url, expiresAt }, options = {}) {
  const environment = options.environment || process.env.NODE_ENV || 'development';
  const apiKey = options.apiKey || process.env.RESEND_API_KEY;
  const from = options.from || process.env.PASSWORD_RESET_FROM_EMAIL || process.env.GUARDIAN_CONSENT_FROM_EMAIL;
  const fetchImpl = options.fetchImpl || globalThis.fetch;

  if (environment !== 'production') {
    developmentLinks.set(String(to).toLowerCase(), url);
    return { delivery: 'development_capture', providerMessageId: null };
  }
  if (!apiKey || !from || typeof fetchImpl !== 'function') {
    throw new PasswordResetDeliveryError('Password reset email delivery is not configured.');
  }

  const expiry = new Intl.DateTimeFormat('en-AU', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Australia/Sydney',
  }).format(new Date(expiresAt));
  const response = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [to],
      subject: 'Reset your Caplet password',
      text: `Use this private, single-use link to reset your Caplet password: ${url}\n\nThe link expires ${expiry}. If you did not request this, you can ignore this email.`,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new PasswordResetDeliveryError('Password reset email could not be delivered.');
  const data = await response.json().catch(() => ({}));
  return { delivery: 'email', providerMessageId: data.id || null };
}

function takeDevelopmentResetUrl(email) {
  const key = String(email || '').toLowerCase();
  const url = developmentLinks.get(key) || null;
  developmentLinks.delete(key);
  return url;
}

module.exports = {
  PasswordResetDeliveryError,
  sendPasswordResetEmail,
  takeDevelopmentResetUrl,
};
