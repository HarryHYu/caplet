const crypto = require('crypto');
const { recordHttpRequest } = require('../services/runtimeMetrics');

const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;

function validRequestId(value) {
  return typeof value === 'string' && REQUEST_ID_PATTERN.test(value);
}

function sanitizePath(pathname = '/') {
  return String(pathname).split('/').map((segment) => {
    if (!segment) return segment;
    if (/^[0-9]+$/.test(segment)) return ':id';
    if (/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(segment)) return ':id';
    if (/^[0-9a-f]{24,}$/i.test(segment)) return ':id';
    if (/^[A-Za-z0-9_-]{20,}$/.test(segment)) return ':value';
    if (segment.length > 40 || segment.includes('@')) return ':value';
    return segment;
  }).join('/') || '/';
}

function requestRoute(req) {
  if (typeof req.route?.path === 'string') {
    return sanitizePath(`${req.baseUrl || ''}${req.route.path}`);
  }
  return sanitizePath(String(req.originalUrl || req.url || '/').split('?')[0]);
}

function createRequestContext(options = {}) {
  const logger = options.logger || ((line) => console.log(line));
  const metricsRecorder = options.metricsRecorder || recordHttpRequest;
  const clock = options.clock || (() => process.hrtime.bigint());
  const idFactory = options.idFactory || (() => crypto.randomUUID());

  return function requestContext(req, res, next) {
    const incoming = req.get?.('x-request-id') || req.headers?.['x-request-id'];
    const requestId = validRequestId(req.requestId)
      ? req.requestId
      : validRequestId(incoming) ? incoming : idFactory();
    const startedAt = clock();

    req.id = requestId;
    req.requestId = requestId;
    res.locals = res.locals || {};
    res.locals.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);

    let duration;
    const elapsed = () => {
      if (duration !== undefined) return duration;
      duration = Number(clock() - startedAt) / 1e6;
      return duration;
    };

    const originalEnd = res.end;
    res.end = function timedEnd(...args) {
      const elapsedMs = elapsed();
      if (!res.headersSent) {
        res.setHeader('Server-Timing', `app;dur=${elapsedMs.toFixed(2)}`);
        res.setHeader('X-Response-Time', `${elapsedMs.toFixed(2)}ms`);
      }
      return originalEnd.apply(this, args);
    };

    let logged = false;
    const writeLog = (outcome) => {
      if (logged) return;
      logged = true;
      const contentLength = Number(res.getHeader?.('content-length'));
      const record = {
        event: 'http_request',
        timestamp: new Date().toISOString(),
        requestId,
        method: String(req.method || 'UNKNOWN').toUpperCase(),
        route: requestRoute(req),
        status: Number(res.statusCode || 0),
        durationMs: Number(elapsed().toFixed(2)),
        responseBytes: Number.isFinite(contentLength) ? contentLength : null,
        authenticated: Boolean(req.user),
        outcome,
      };
      try {
        metricsRecorder(record);
      } catch {
        // Metrics must never break a user request.
      }
      try {
        logger(JSON.stringify(record));
      } catch {
        // Logging must never break a user request.
      }
    };

    res.once('finish', () => writeLog('completed'));
    res.once('close', () => {
      if (!res.writableEnded) writeLog('aborted');
    });
    next();
  };
}

const requestContext = createRequestContext();

module.exports = {
  REQUEST_ID_PATTERN,
  createRequestContext,
  requestContext,
  sanitizePath,
  validRequestId,
};
