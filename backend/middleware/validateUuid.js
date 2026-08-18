/**
 * Shared UUID route-param guard.
 *
 * Postgres raises `invalid input syntax for type uuid` (a 500) when a
 * malformed id reaches a UUID-typed column; SQLite silently tolerates it, so
 * the bug only shows in production. Guarding the param keeps the response a
 * plain 404 — indistinguishable from a missing record, which is also the
 * correct information leak (none).
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isUuid = (value) => UUID_RE.test(String(value || ''));

/**
 * Express middleware factory: 404s when req.params[name] is not a UUID.
 * @param {string} name  the route param to validate
 * @param {string} [message]  the same not-found message the route would use
 */
function requireUuidParam(name, message = 'Not found') {
  return (req, res, next) => {
    if (!isUuid(req.params[name])) {
      return res.status(404).json({ message });
    }
    return next();
  };
}

module.exports = { requireUuidParam, isUuid };
