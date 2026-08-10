const APPROVED_EMBED_HOSTS = new Set([
  'www.youtube.com',
  'youtube.com',
  'player.vimeo.com',
  'www.desmos.com',
  'desmos.com',
  'phet.colorado.edu',
  'www.geogebra.org',
  'www.google.com',
]);

function isAllowedEmbedUrl(value) {
  try {
    const url = new URL(String(value));
    const host = url.hostname.toLowerCase();
    if (url.protocol !== 'https:' || !APPROVED_EMBED_HOSTS.has(host)) return false;
    if (url.username || url.password || url.port) return false;

    if (host === 'www.google.com') return url.pathname.startsWith('/maps/embed/v1/');
    if (host === 'phet.colorado.edu') {
      return /^\/sims\/html\/[a-z0-9-]+\/latest\/[a-z0-9-]+_[a-z]{2}(?:_[a-z]{2})?\.html$/i.test(url.pathname);
    }
    if (host === 'www.geogebra.org') {
      return /^\/(classic|graphing|geometry|3d|scientific)(?:\/|$)/i.test(url.pathname);
    }
    if (host === 'www.desmos.com' || host === 'desmos.com') {
      return /^\/(calculator|3d|geometry|scientific)(?:\/|$)/i.test(url.pathname);
    }
    if (host === 'player.vimeo.com') return /^\/video\/\d+(?:\/|$)/.test(url.pathname);
    if (host === 'youtube.com' || host === 'www.youtube.com') return /^\/embed\/[A-Za-z0-9_-]{6,}$/.test(url.pathname);
    return false;
  } catch {
    return false;
  }
}

module.exports = { APPROVED_EMBED_HOSTS, isAllowedEmbedUrl };
