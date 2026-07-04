/**
 * twinTypes — the first-class data contracts of the Financial Twin Engine, as
 * JSDoc typedefs. Nothing executable lives here; modules import these with
 * `@typedef {import('./twinTypes').X} X` so the CDR payload shape, the
 * categorization output and the projection result are typed at every seam.
 *
 * The Cdr* raw shapes mirror the Consumer Data Right banking API (string
 * decimal amounts, ISO 8601 datetimes, data/links/meta envelopes) so the
 * mocked provider and a future accredited client are interchangeable.
 */

'use strict';

/**
 * A CDR account as returned by a data holder. `providerBrand` values in the
 * mock are FICTIONAL brands only — no real provider may be named anywhere.
 * @typedef {Object} CdrAccount
 * @property {string} accountId
 * @property {'TRANS_AND_SAVINGS_ACCOUNTS'|'CRED_AND_CHRG_CARDS'|'PERS_LOANS'|'BUY_NOW_PAY_LATER'|'SUPERANNUATION'} productCategory
 * @property {string} displayName
 * @property {string} providerBrand
 * @property {string} maskedNumber
 * @property {{ current: string, available?: string }} balance  Decimal strings, e.g. "1234.56". Negative = owing.
 */

/**
 * A raw CDR transaction. `amount` is a signed decimal string (negative =
 * debit/outflow from the account's perspective).
 * @typedef {Object} CdrTransactionRaw
 * @property {string} transactionId
 * @property {string} accountId
 * @property {'POSTED'|'PENDING'} status
 * @property {string} description
 * @property {string} amount
 * @property {'AUD'} currency
 * @property {string} postingDateTime ISO 8601
 * @property {string|null} [merchantName]
 * @property {string|null} [merchantCategoryCode]
 * @property {'PAYMENT'|'TRANSFER_INCOMING'|'TRANSFER_OUTGOING'|'INTEREST_PAID'|'FEE'|'DIRECT_DEBIT'} type
 */

/**
 * An account after boundary normalization — whole-dollar signed integers,
 * nothing downstream ever sees a CDR string amount.
 * @typedef {Object} TwinAccount
 * @property {string} accountId
 * @property {CdrAccount['productCategory']} productCategory
 * @property {string} displayName
 * @property {number} balance  Whole AUD dollars, signed (negative = owing).
 */

/**
 * A transaction after boundary normalization.
 * @typedef {Object} TwinTransaction
 * @property {string} transactionId
 * @property {string} accountId
 * @property {string} description
 * @property {number} amount  Whole AUD dollars, signed (negative = outflow).
 * @property {string} postedAt ISO 8601
 * @property {string|null} merchantCategoryCode
 * @property {string} type
 */

/**
 * The categorizer's verdict for one transaction. `uncertain: true` is the
 * FAIL-SAFE state — the pipeline prefers flagging over confident
 * miscategorization, and downstream consumers must treat uncertain rows as
 * unknowns, never fold them into a category total.
 * @typedef {Object} CategorizedTxn
 * @property {string} txnId
 * @property {'income'|'hecs'|'bnpl'|'consumer_debt'|'super'|'transfer'|'spending'|'uncertain'} category
 * @property {number} confidence 0..1
 * @property {boolean} uncertain
 * @property {string[]} signals Internal diagnostic tokens (not user-facing copy).
 */

/**
 * Aggregate view of a categorized transaction set.
 * @typedef {Object} CategorizedSummary
 * @property {Object<string, number>} totalsByCategory Signed whole-dollar sums per category.
 * @property {number} monthlyIncomeEstimate
 * @property {number} monthlySpendEstimate
 * @property {number} transactionCount
 * @property {number} uncertainCount
 * @property {number} uncertainRatio 0..1
 */

/**
 * One year of one series in percentile form. p10..p90 are whole AUD dollars.
 * @typedef {Object} PercentileYear
 * @property {number} year
 * @property {number} p10
 * @property {number} p25
 * @property {number} p50
 * @property {number} p75
 * @property {number} p90
 */

/**
 * The projection engine's full result. `assumptions` carries provenance
 * (effective date + source) for every figure the ranges rest on; `summary`
 * and `disclaimer` are scenario-framed template strings — never advice.
 * @typedef {Object} ProjectionResult
 * @property {number} seed
 * @property {number} trials
 * @property {number} horizonYears
 * @property {string} assumptionsVersion
 * @property {Array<{key:string, value:number, effectiveDate:string, source:string}>} assumptions
 * @property {{ hecsBalance: PercentileYear[], superBalance: PercentileYear[],
 *              savingsBalance: PercentileYear[], netPosition: PercentileYear[] }} series
 * @property {Object} horizons Snapshot of each series at ~10y and the final horizon year.
 * @property {string} summary
 * @property {string} disclaimer
 */

module.exports = {};
