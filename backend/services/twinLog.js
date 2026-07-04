/**
 * twinLog — structured logging for the Financial Twin's ingestion and
 * projection boundaries.
 *
 * RESPONSIBILITY: one place that guarantees the logging rule for ingested
 * financial data — LOG IDENTIFIERS AND SHAPES ONLY, never transaction
 * descriptions, merchant names, amounts, balances or any other financial
 * value. Callers pass counts/ids/flags; this module refuses the rest.
 *
 * Deliberately console-based (the repo has no logger dependency) but emits a
 * single JSON line per event so the output is grep- and machine-friendly.
 */

'use strict';

/**
 * Field names that must never appear in a twin log entry. A dev passing one
 * is a bug we'd rather surface loudly in dev than ship silently.
 */
const FORBIDDEN_FIELDS = ['description', 'merchantName', 'amount', 'balance', 'accessToken', 'refreshToken'];

/**
 * @param {string} event  e.g. 'cdr.sync.completed', 'twin.projection.served'
 * @param {Object<string, string|number|boolean|null>} [fields] Identifiers, counts and flags only.
 */
function logTwin(event, fields = {}) {
  const clean = {};
  for (const [key, value] of Object.entries(fields)) {
    if (FORBIDDEN_FIELDS.includes(key)) {
      throw new Error(`twinLog: refusing to log forbidden field "${key}" — identifiers and shapes only`);
    }
    clean[key] = value;
  }
  console.log(JSON.stringify({ evt: event, ...clean }));
}

/**
 * Error-level variant. Logs the error's class and message (safe — our CDR
 * error messages carry no financial data) plus the same vetted fields.
 * @param {string} event
 * @param {Error} error
 * @param {Object<string, string|number|boolean|null>} [fields]
 */
function logTwinError(event, error, fields = {}) {
  logTwin(event, { ...fields, errorName: error && error.name, errorMessage: error && error.message });
}

module.exports = { logTwin, logTwinError, FORBIDDEN_FIELDS };
