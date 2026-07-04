/**
 * cdr/errors — the error vocabulary of the CDR boundary. Downstream code
 * (routes, sync logic) catches these BY CLASS, never by parsing message text
 * or peeking at mock internals, so a real accredited client can throw the
 * same classes and nothing downstream changes.
 */

'use strict';

/** Base class for everything the CDR layer can throw. */
class CdrError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

/** Token missing/expired/invalid — the consent never existed or can't be proven. */
class CdrAuthError extends CdrError {}

/**
 * The consumer withdrew consent — possibly mid-session, between two pages of
 * the same sync. Handlers must stop ingesting and purge per the data standard.
 */
class CdrConsentRevokedError extends CdrError {}

/**
 * A data holder returned some accounts/transactions but not others (outage,
 * scope gap). Carries what WAS retrieved so the caller can proceed explicitly
 * partially rather than silently.
 */
class CdrPartialDataError extends CdrError {
  /**
   * @param {string} message
   * @param {{ accountId?: string }} [details]
   */
  constructor(message, details = {}) {
    super(message);
    this.accountId = details.accountId || null;
  }
}

/** A provider payload failed shape validation at the boundary. Never coerced. */
class CdrPayloadError extends CdrError {}

/**
 * The process is configured dangerously: real CDR credentials present without
 * the accreditation flag, or CDR_MODE=real unaccredited. Thrown (not exit())
 * so it is unit-testable; server.js converts it to a refused boot.
 */
class CdrBootSafetyError extends CdrError {}

module.exports = {
  CdrError,
  CdrAuthError,
  CdrConsentRevokedError,
  CdrPartialDataError,
  CdrPayloadError,
  CdrBootSafetyError,
};
