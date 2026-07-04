/**
 * cdr — the SINGLE adapter boundary between Caplet and the Consumer Data
 * Right. Everything downstream (categorizer, projection, routes) talks only
 * to this module's normalized shapes and error classes; nothing else may
 * import the mock provider directly. When accreditation clears, a real
 * accredited client drops in behind getCdrProvider() and NOTHING downstream
 * changes.
 *
 * Three responsibilities:
 *  1. Provider selection (CDR_MODE) with a hard accreditation gate.
 *  2. Boundary validation + normalization: CDR string-decimal payloads are
 *     shape-checked and converted to whole-dollar signed integers here, and
 *     ONLY here. Malformed payloads throw CdrPayloadError — never coerced.
 *  3. Boot safety: assertCdrBootSafety() refuses a process that holds real
 *     CDR credentials without the accreditation flag, so mocked and real
 *     modes can never be confused.
 */

'use strict';

const errors = require('./errors');
const { CdrPayloadError, CdrBootSafetyError } = errors;

/** Env var names that would only ever hold REAL CDR credentials. */
const REAL_CDR_CREDENTIAL_VARS = ['CDR_CLIENT_ID', 'CDR_CLIENT_SECRET', 'CDR_PRIVATE_KEY_PATH'];

/** The product categories the twin understands (mirrors the CDR standard's). */
const PRODUCT_CATEGORIES = [
  'TRANS_AND_SAVINGS_ACCOUNTS',
  'CRED_AND_CHRG_CARDS',
  'PERS_LOANS',
  'BUY_NOW_PAY_LATER',
  'SUPERANNUATION',
];

/**
 * Refuse to run in an ambiguous or dangerous CDR configuration. Throws
 * CdrBootSafetyError (unit-testable); server.js converts a throw into a
 * refused boot (console.error + exit 1), mirroring the JWT_SECRET guard.
 *
 * Rules:
 *  - Any real credential var set while CDR_ACCREDITED !== 'true' → refuse.
 *    Accreditation is a regulatory fact, not an engineering flag to flip.
 *  - CDR_MODE=real without CDR_ACCREDITED === 'true' → refuse.
 *
 * @param {NodeJS.ProcessEnv} env
 */
function assertCdrBootSafety(env) {
  const accredited = env.CDR_ACCREDITED === 'true';
  const presentCreds = REAL_CDR_CREDENTIAL_VARS.filter((name) => env[name] && String(env[name]).trim() !== '');

  if (presentCreds.length > 0 && !accredited) {
    throw new CdrBootSafetyError(
      `Real CDR credential(s) present (${presentCreds.join(', ')}) but CDR_ACCREDITED is not 'true'. ` +
        'Refusing to start: accreditation is a regulatory prerequisite. Remove the credentials or, ' +
        'once accreditation has actually cleared, set CDR_ACCREDITED=true.'
    );
  }
  if (env.CDR_MODE === 'real' && !accredited) {
    throw new CdrBootSafetyError(
      "CDR_MODE=real requires CDR_ACCREDITED='true'. Refusing to start so mocked and real modes cannot be confused."
    );
  }
}

let _provider = null;

/**
 * The provider behind the boundary. Lazy singleton (same discipline as the
 * OpenAI getClient() pattern). CDR_MODE:
 *   'mock' (default) — the in-repo synthetic provider.
 *   'real'           — requires accreditation; not yet implemented. This is
 *                      the accreditation boundary: build stops here on purpose.
 */
function getCdrProvider() {
  if (_provider) return _provider;
  const mode = process.env.CDR_MODE || 'mock';
  if (mode === 'real') {
    assertCdrBootSafety(process.env);
    throw new Error(
      'Real CDR provider is not implemented: CDR accreditation is a pending regulatory process, ' +
        'not an engineering task. Implement services/cdr/realCdrProvider.js behind this factory once accredited.'
    );
  }
  _provider = require('./mockCdrProvider'); // lazy so tests can _reset between cases
  return _provider;
}

// ---------------------------------------------------------------------------
// Boundary validation + normalization
// ---------------------------------------------------------------------------

/**
 * Minimal shape assertion. spec values: 'string' | 'number' | 'string?' etc.
 * Small on purpose — the payloads are flat and a schema library would be a
 * heavier dependency than ~20 lines of code.
 */
function assertShape(obj, spec, where) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    throw new CdrPayloadError(`${where}: expected an object`);
  }
  for (const [key, type] of Object.entries(spec)) {
    const optional = type.endsWith('?');
    const base = optional ? type.slice(0, -1) : type;
    const value = obj[key];
    if (value == null) {
      if (optional) continue;
      throw new CdrPayloadError(`${where}: missing required field "${key}"`);
    }
    if (typeof value !== base) {
      throw new CdrPayloadError(`${where}: field "${key}" should be ${base}, got ${typeof value}`);
    }
  }
}

/** A CDR decimal string ("1234.56" / "-42.00") → whole signed AUD dollars. */
function parseCdrAmount(value, where) {
  if (typeof value !== 'string' || !/^-?\d+(\.\d{1,2})?$/.test(value.trim())) {
    throw new CdrPayloadError(`${where}: amount "${value}" is not a CDR decimal string`);
  }
  return Math.round(Number(value));
}

/**
 * @param {Array} cdrAccounts Raw accounts from the provider envelope.
 * @returns {Array<import('../twinTypes').TwinAccount>}
 */
function normalizeAccounts(cdrAccounts) {
  if (!Array.isArray(cdrAccounts)) throw new CdrPayloadError('accounts payload is not an array');
  return cdrAccounts.map((acc, i) => {
    const where = `accounts[${i}]`;
    assertShape(acc, { accountId: 'string', productCategory: 'string', displayName: 'string' }, where);
    assertShape(acc.balance, { current: 'string' }, `${where}.balance`);
    if (!PRODUCT_CATEGORIES.includes(acc.productCategory)) {
      throw new CdrPayloadError(`${where}: unknown productCategory "${acc.productCategory}"`);
    }
    return {
      accountId: acc.accountId,
      productCategory: acc.productCategory,
      displayName: acc.displayName,
      balance: parseCdrAmount(acc.balance.current, `${where}.balance.current`),
    };
  });
}

/**
 * @param {Array} cdrTxns Raw transactions from the provider envelope.
 * @returns {Array<import('../twinTypes').TwinTransaction>}
 */
function normalizeTransactions(cdrTxns) {
  if (!Array.isArray(cdrTxns)) throw new CdrPayloadError('transactions payload is not an array');
  return cdrTxns.map((t, i) => {
    const where = `transactions[${i}]`;
    assertShape(
      t,
      { transactionId: 'string', accountId: 'string', description: 'string', amount: 'string', postingDateTime: 'string', type: 'string', status: 'string' },
      where
    );
    return {
      transactionId: t.transactionId,
      accountId: t.accountId,
      description: t.description,
      amount: parseCdrAmount(t.amount, `${where}.amount`),
      postedAt: t.postingDateTime,
      merchantCategoryCode: t.merchantCategoryCode || null,
      type: t.type,
    };
  });
}

/** Test hook — drop the cached provider (pairs with mock's _reset). */
function _resetProvider() {
  _provider = null;
}

module.exports = {
  ...errors,
  REAL_CDR_CREDENTIAL_VARS,
  PRODUCT_CATEGORIES,
  assertCdrBootSafety,
  getCdrProvider,
  assertShape,
  parseCdrAmount,
  normalizeAccounts,
  normalizeTransactions,
  _resetProvider,
};
