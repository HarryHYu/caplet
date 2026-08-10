const REFRESH_COOKIE_NAME = process.env.AUTH_REFRESH_COOKIE_NAME || 'caplet_refresh';
const DEFAULT_REFRESH_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function refreshCookieOptions() {
  const secure = process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production';
  const requestedSameSite = String(process.env.AUTH_COOKIE_SAMESITE || '').toLowerCase();
  const sameSite = secure && ['lax', 'strict', 'none'].includes(requestedSameSite)
    ? requestedSameSite
    : secure
      ? 'none'
      : 'lax';
  const maxAge = Number(process.env.AUTH_REFRESH_COOKIE_MAX_AGE_MS || DEFAULT_REFRESH_MAX_AGE_MS);

  return {
    httpOnly: true,
    secure,
    sameSite,
    path: '/api/auth',
    maxAge: Number.isFinite(maxAge) && maxAge > 0 ? maxAge : DEFAULT_REFRESH_MAX_AGE_MS,
  };
}

function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE_NAME, token, refreshCookieOptions());
}

function clearRefreshCookie(res) {
  const { maxAge, ...options } = refreshCookieOptions();
  void maxAge;
  res.clearCookie(REFRESH_COOKIE_NAME, options);
}

function getRefreshCookie(req) {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    const name = part.slice(0, separator).trim();
    if (name !== REFRESH_COOKIE_NAME) continue;
    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}

function hasWebClientHeader(req) {
  return req.get('X-Caplet-Client') === 'web';
}

module.exports = {
  REFRESH_COOKIE_NAME,
  refreshCookieOptions,
  setRefreshCookie,
  clearRefreshCookie,
  getRefreshCookie,
  hasWebClientHeader,
};
