const express = require('express');
const router = express.Router();

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
  'lh3.googleusercontent.com',
  'res.cloudinary.com',
]);

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

function isAllowedUrl(urlString) {
  try {
    const u = new URL(urlString);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    const host = u.hostname.toLowerCase();
    return ALLOWED_IMAGE_HOSTS.has(host) || [...ALLOWED_IMAGE_HOSTS].some((h) => host.endsWith('.' + h));
  } catch {
    return false;
  }
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
router.get('/proxy-image', async (req, res) => {
  const rawUrl = req.query.url;
  if (!rawUrl || typeof rawUrl !== 'string') {
    return res.status(400).json({ message: 'Missing url query parameter' });
  }

  let decodedUrl = decodeURIComponent(rawUrl.trim());
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

      const response = await fetch(targetUrl, {
        method: 'GET',
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          'User-Agent': BROWSER_UA,
          'Accept': 'image/*,*/*;q=0.9',
          ...driveReferer,
        },
      });
      clearTimeout(timeout);

      if (!response.ok) continue;

      const contentType = (response.headers.get('content-type') || 'image/png').split(';')[0].trim().toLowerCase();
      if (contentType.includes('text/html')) continue;

      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength, 10) > MAX_IMAGE_SIZE) {
        return res.status(413).json({ message: 'Image too large' });
      }

      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > MAX_IMAGE_SIZE) {
        return res.status(413).json({ message: 'Image too large' });
      }

      res.set('Cache-Control', 'public, max-age=86400');
      res.set('Content-Type', response.headers.get('content-type') || 'image/png');
      res.set('Cross-Origin-Resource-Policy', 'cross-origin');
      res.set('Access-Control-Allow-Origin', '*');
      res.send(Buffer.from(buffer));
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
