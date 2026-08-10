/**
 * Structured post-content blocks — the server-side half of the block
 * composer (Text, Math, Code, Image, Chart, Table, Graph/Desmos, GeoGebra,
 * 3D model, Embed).
 *
 * SECURITY MODEL — read before touching this file:
 * - Blocks are validated/rebuilt field-by-field here. The client's payload
 *   is never trusted or stored verbatim; every field is re-typed, clamped,
 *   or re-derived.
 * - Nothing here ever produces or accepts raw HTML/script/iframe strings.
 *   Third-party embeds (Desmos/GeoGebra/YouTube) are reduced to just an
 *   identifier or a URL matched against an exact-hostname allowlist, then
 *   the final safe embed URL is reconstructed here — the frontend never
 *   renders a URL the client supplied directly.
 * - image/model3d blocks store only an `assetId`; the `url` is *always*
 *   resolved server-side from the UploadedAsset registry (ownership +
 *   purpose + status='ready' checked), never taken from client input.
 */
const crypto = require('crypto');
const { UploadedAsset } = require('../models');
const { publicObjectUrl } = require('./s3Presign');

const BLOCK_TYPES = ['text', 'math', 'code', 'image', 'chart', 'table', 'graph', 'geogebra', 'model3d', 'embed'];
const CHART_TYPES = ['line', 'bar', 'scatter'];

const LIMITS = {
  textMarkdown: 8000,
  mathLatex: 2000,
  codeContent: 8000,
  codeLanguage: 32,
  chartTitle: 200,
  chartLabel: 100,
  chartSeries: 20,
  chartPoints: 500,
  tableColumns: 20,
  tableRows: 200,
  tableCell: 300,
  imageAlt: 300,
  maxBlocksPerPost: 40,
};

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function clampString(value, max) {
  return String(value == null ? '' : value).slice(0, max);
}

// --- Third-party embed allowlist ------------------------------------------
// Exact hostname + path-shape match only (never a substring/regex over the
// full URL) so an attacker can't smuggle a different origin past this check
// with e.g. `https://evil.example/?u=https://www.desmos.com`.

function validateDesmosUrl(raw) {
  let url;
  try { url = new URL(String(raw || '').trim()); } catch { return null; }
  if (url.protocol !== 'https:' || url.hostname !== 'www.desmos.com') return null;
  if (!/^\/calculator\/[a-zA-Z0-9]+$/.test(url.pathname)) return null;
  return `https://www.desmos.com${url.pathname}?embed`;
}

function validateGeogebraUrl(raw) {
  let url;
  try { url = new URL(String(raw || '').trim()); } catch { return null; }
  if (url.protocol !== 'https:' || url.hostname !== 'www.geogebra.org') return null;
  if (!/^\/(classic|calculator|3d|geometry|m)\/[a-zA-Z0-9]+$/.test(url.pathname)) return null;
  return `https://www.geogebra.org${url.pathname}`;
}

const YOUTUBE_ID_RE = /^[a-zA-Z0-9_-]{11}$/;
function extractYoutubeId(raw) {
  const value = String(raw || '').trim();
  if (YOUTUBE_ID_RE.test(value)) return value;
  let url;
  try { url = new URL(value); } catch { return null; }
  if (url.hostname === 'youtu.be') {
    const id = url.pathname.slice(1);
    return YOUTUBE_ID_RE.test(id) ? id : null;
  }
  if (['www.youtube.com', 'youtube.com', 'm.youtube.com'].includes(url.hostname)) {
    const v = url.searchParams.get('v');
    if (v && YOUTUBE_ID_RE.test(v)) return v;
    const embedMatch = url.pathname.match(/^\/embed\/([a-zA-Z0-9_-]{11})$/);
    if (embedMatch) return embedMatch[1];
  }
  return null;
}

// --- Structured-data blocks -------------------------------------------------

function sanitizeChart(data) {
  const chartType = CHART_TYPES.includes(data?.chartType) ? data.chartType : 'line';
  const title = clampString(data?.title, LIMITS.chartTitle);
  const xLabel = clampString(data?.xLabel, LIMITS.chartLabel);
  const yLabel = clampString(data?.yLabel, LIMITS.chartLabel);
  const labels = (Array.isArray(data?.labels) ? data.labels : []).slice(0, LIMITS.chartPoints).map((l) => clampString(l, 60));
  const series = (Array.isArray(data?.series) ? data.series : [])
    .slice(0, LIMITS.chartSeries)
    .map((s) => ({
      name: clampString(s?.name, 60) || 'Series',
      data: (Array.isArray(s?.data) ? s.data : []).slice(0, LIMITS.chartPoints).map((n) => (Number.isFinite(Number(n)) ? Number(n) : 0)),
    }))
    .filter((s) => s.data.length > 0);
  if (!series.length) return null;
  return { chartType, title, xLabel, yLabel, labels, series };
}

function sanitizeTable(data) {
  const columns = (Array.isArray(data?.columns) ? data.columns : []).slice(0, LIMITS.tableColumns).map((c) => clampString(c, 80));
  if (!columns.length) return null;
  const rows = (Array.isArray(data?.rows) ? data.rows : []).slice(0, LIMITS.tableRows).map((row) => {
    const r = Array.isArray(row) ? row : [];
    return columns.map((_, i) => clampString(r[i], LIMITS.tableCell));
  });
  return { columns, rows };
}

async function resolveOwnedAsset(assetId, purpose, userId) {
  const asset = await UploadedAsset.findOne({ where: { id: assetId, userId, purpose, status: 'ready' } });
  if (!asset) return null;
  return { url: publicObjectUrl(asset.key) };
}

/**
 * Validates + rebuilds a client-submitted blocks array for one thread/post.
 * Throws a { status: 400 } error on anything structurally invalid — we 400
 * rather than silently drop content the author thought they'd submitted.
 * Returns [] for undefined/null input (blocks are optional; legacy plain-
 * text threads/posts never send this field).
 */
async function validateAndSanitizeBlocks(rawBlocks, userId) {
  if (rawBlocks === undefined || rawBlocks === null) return [];
  if (!Array.isArray(rawBlocks)) throw badRequest('blocks must be an array');
  if (rawBlocks.length > LIMITS.maxBlocksPerPost) throw badRequest(`A post can have at most ${LIMITS.maxBlocksPerPost} blocks`);

  const out = [];
  for (const raw of rawBlocks) {
    if (!raw || typeof raw !== 'object' || !BLOCK_TYPES.includes(raw.type)) {
      throw badRequest('Every block needs a valid type');
    }
    const id = clampString(raw.id, 40) || crypto.randomUUID();
    switch (raw.type) {
      case 'text': {
        const markdown = clampString(raw.data?.markdown, LIMITS.textMarkdown);
        if (markdown.trim()) out.push({ id, type: 'text', data: { markdown } });
        break;
      }
      case 'math': {
        const latex = clampString(raw.data?.latex, LIMITS.mathLatex);
        if (latex.trim()) out.push({ id, type: 'math', data: { latex } });
        break;
      }
      case 'code': {
        const code = clampString(raw.data?.code, LIMITS.codeContent);
        if (code.trim()) out.push({ id, type: 'code', data: { code, language: clampString(raw.data?.language, LIMITS.codeLanguage) || 'text' } });
        break;
      }
      case 'image': {
        const assetId = clampString(raw.data?.assetId, 64);
        if (!assetId) throw badRequest('Image block is missing its uploaded file');
        const asset = await resolveOwnedAsset(assetId, 'forumImage', userId);
        if (!asset) throw badRequest('That image was not found — upload it again');
        out.push({ id, type: 'image', data: { assetId, url: asset.url, alt: clampString(raw.data?.alt, LIMITS.imageAlt) } });
        break;
      }
      case 'model3d': {
        const assetId = clampString(raw.data?.assetId, 64);
        if (!assetId) throw badRequest('3D model block is missing its uploaded file');
        const asset = await resolveOwnedAsset(assetId, 'forumModel', userId);
        if (!asset) throw badRequest('That 3D model was not found — upload it again');
        out.push({ id, type: 'model3d', data: { assetId, url: asset.url } });
        break;
      }
      case 'chart': {
        const chart = sanitizeChart(raw.data);
        if (!chart) throw badRequest('A chart needs at least one data series with values');
        out.push({ id, type: 'chart', data: chart });
        break;
      }
      case 'table': {
        const table = sanitizeTable(raw.data);
        if (!table) throw badRequest('A table needs at least one column');
        out.push({ id, type: 'table', data: table });
        break;
      }
      case 'graph': {
        const url = validateDesmosUrl(raw.data?.url);
        if (!url) throw badRequest("That doesn't look like a Desmos calculator link (desmos.com/calculator/...)");
        out.push({ id, type: 'graph', data: { provider: 'desmos', url } });
        break;
      }
      case 'geogebra': {
        const url = validateGeogebraUrl(raw.data?.url);
        if (!url) throw badRequest("That doesn't look like a GeoGebra link (geogebra.org/classic/... or /m/...)");
        out.push({ id, type: 'geogebra', data: { provider: 'geogebra', url } });
        break;
      }
      case 'embed': {
        const videoId = extractYoutubeId(raw.data?.videoId || raw.data?.url);
        if (!videoId) throw badRequest("That doesn't look like a YouTube link");
        out.push({ id, type: 'embed', data: { provider: 'youtube', videoId } });
        break;
      }
      default:
        throw badRequest('Unknown block type');
    }
  }
  return out;
}

/** Plain-text projection of the blocks, for search indexing / notification text / report snapshots. */
function deriveTextFromBlocks(blocks) {
  return blocks
    .filter((b) => b.type === 'text' || b.type === 'math' || b.type === 'code')
    .map((b) => (b.type === 'text' ? b.data.markdown : b.type === 'math' ? `$$${b.data.latex}$$` : b.data.code))
    .join('\n\n')
    .trim();
}

module.exports = {
  BLOCK_TYPES,
  LIMITS,
  validateAndSanitizeBlocks,
  deriveTextFromBlocks,
  extractYoutubeId,
};
