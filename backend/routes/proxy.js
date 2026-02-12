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

/**
 * GET /api/proxy-image?url=...
 * Proxies image from url when the origin is blocked at school (e.g. Reddit, or use Google Drive / Imgur / Cloudinary).
 */
router.get('/proxy-image', async (req, res) => {
  const rawUrl = req.query.url;
  if (!rawUrl || typeof rawUrl !== 'string') {
    return res.status(400).json({ message: 'Missing url query parameter' });
  }

  const decodedUrl = decodeURIComponent(rawUrl.trim());
  if (!isAllowedUrl(decodedUrl)) {
    return res.status(403).json({ message: 'URL not allowed for proxy' });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(decodedUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'CapletEdu-ImageProxy/1.0',
      },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(response.status).send(response.statusText);
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_IMAGE_SIZE) {
      return res.status(413).json({ message: 'Image too large' });
    }

    res.set('Cache-Control', 'public, max-age=86400'); // 24h
    res.set('Content-Type', contentType);
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_IMAGE_SIZE) {
      return res.status(413).json({ message: 'Image too large' });
    }
    res.send(Buffer.from(buffer));
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ message: 'Upstream timeout' });
    }
    console.error('Proxy image error:', err.message);
    return res.status(502).json({ message: 'Failed to fetch image' });
  }
});

module.exports = router;
