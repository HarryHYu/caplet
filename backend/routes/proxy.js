const express = require('express');
const { createRateLimiter } = require('../middleware/rateLimit');
const router = express.Router();
const proxyLimiter = createRateLimiter({ scope: 'image_proxy', windowMs: 60000, max: 60 });

// Cloud image hosts that may be blocked at school. Proxy so lesson images still load.
const ALLOWED_IMAGE_HOSTS = new Set([
  'i.redd.it',
  'preview.redd.it',
  'external-preview.redd.it',
  'i.imgur.com',
  'imgur.com',
  'reddit.com',
  'www.reddit.com',
  'old.reddit.com',
  'drive.google.com',
  'drive.usercontent.google.com',
  'lh3.googleusercontent.com',
  'res.cloudinary.com',
]);

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

function isAllowedUrl(urlString) {
  try {
    const u = new URL(urlString);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    if (u.username || u.password) return false;
    if (u.port && !((u.protocol === 'https:' && u.port === '443') || (u.protocol === 'http:' && u.port === '80'))) return false;
    const host = u.hostname.toLowerCase();
    return ALLOWED_IMAGE_HOSTS.has(host) || [...ALLOWED_IMAGE_HOSTS].some((h) => host.endsWith('.' + h));
  } catch {
    return false;
  }
}

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

async function fetchAllowedUrl(initialUrl, options, maxRedirects = 4) {
  let currentUrl = initialUrl;
  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
    if (!isAllowedUrl(currentUrl)) throw new Error('Redirect destination is not allowed');
    const response = await fetch(currentUrl, { ...options, redirect: 'manual' });
    if (!REDIRECT_STATUSES.has(response.status)) return response;
    const location = response.headers.get('location');
    response.body?.cancel().catch(() => {});
    if (!location || redirectCount === maxRedirects) throw new Error('Too many or invalid redirects');
    currentUrl = new URL(location, currentUrl).toString();
  }
  throw new Error('Too many redirects');
}

function detectedImageType(buffer) {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.length >= 6 && ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString('ascii'))) return 'image/gif';
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  if (buffer.length >= 12 && buffer.subarray(4, 12).toString('ascii').includes('ftypavif')) return 'image/avif';
  return null;
}

// Google Drive: extract file ID; we'll try multiple URL formats (thumbnail often 403 from server, view/download may work).
function getDriveFileId(urlString) {
  try {
    const u = new URL(urlString);
    if (u.hostname.toLowerCase() !== 'drive.google.com') return null;
    return u.searchParams.get('id') || (u.pathname.match(/\/d\/([^/]+)/) || [])[1] || null;
  } catch {
    return null;
  }
}

function getDriveImageUrls(id) {
  if (!id) return [];
  return [
    `https://drive.google.com/uc?export=view&id=${id}`,
    `https://drive.google.com/thumbnail?id=${id}&sz=w1920`,
    `https://drive.google.com/uc?export=download&id=${id}&confirm=t`,
  ];
}

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * GET /api/proxy-image?url=...
 * Proxies image from url when the origin is blocked at school (e.g. Reddit, or use Google Drive / Imgur / Cloudinary).
 */
router.get('/proxy-image', proxyLimiter, async (req, res) => {
  const rawUrl = req.query.url;
  if (!rawUrl || typeof rawUrl !== 'string') {
    return res.status(400).json({ message: 'Missing url query parameter' });
  }

  let decodedUrl;
  try {
    decodedUrl = decodeURIComponent(rawUrl.trim());
  } catch {
    return res.status(400).json({ message: 'Invalid URL encoding' });
  }
  if (!isAllowedUrl(decodedUrl)) {
    return res.status(403).json({ message: 'URL not allowed for proxy' });
  }

  const driveId = getDriveFileId(decodedUrl);
  const urlsToTry = driveId ? getDriveImageUrls(driveId) : [decodedUrl];
  const isDrive = !!driveId;
  const driveReferer = isDrive ? { Referer: 'https://drive.google.com/' } : {};

  for (const targetUrl of urlsToTry) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const response = await fetchAllowedUrl(targetUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': BROWSER_UA,
          'Accept': 'image/*,*/*;q=0.9',
          ...driveReferer,
        },
      });
      clearTimeout(timeout);

      if (!response.ok) continue;

      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength, 10) > MAX_IMAGE_SIZE) {
        return res.status(413).json({ message: 'Image too large' });
      }

      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength > MAX_IMAGE_SIZE) {
        return res.status(413).json({ message: 'Image too large' });
      }
      const buffer = Buffer.from(arrayBuffer);
      const contentType = detectedImageType(buffer);
      if (!contentType) continue;

      res.set('Cache-Control', 'public, max-age=86400');
      res.set('Content-Type', contentType);
      res.set('Cross-Origin-Resource-Policy', 'cross-origin');
      res.set('Access-Control-Allow-Origin', '*');
      res.send(buffer);
      return;
    } catch (err) {
      if (err.name === 'AbortError') {
        return res.status(504).json({ message: 'Upstream timeout' });
      }
      continue;
    }
  }

  return res.status(502).json({
    message: isDrive
      ? 'Drive image could not be fetched; ensure sharing is "Anyone with the link"'
      : 'Failed to fetch image',
  });
});

module.exports = router;
