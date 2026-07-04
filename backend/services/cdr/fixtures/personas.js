/**
 * cdr/fixtures/personas — deterministic synthetic CDR data for the mocked
 * provider. Each persona is a bundle of accounts + raw CDR transactions that
 * exercises a specific hard case the real world will throw at us:
 *
 *   grad-hecs-bnpl      — the core student: fortnightly salary, HELP payments,
 *                         BNPL instalments with IRREGULAR timing (a missed
 *                         fortnight then a double catch-up), employer SG.
 *   messy-merchants     — adversarial descriptions: a café on Help St, an ATO
 *                         payment plan that is NOT a HELP repayment, a
 *                         zipline tour that isn't a BNPL provider, an auto
 *                         shop with "SUPA" in the name, a credit card
 *                         charging real interest.
 *   partial-data        — one account serves data, the other fails (holder
 *                         outage), so ingestion must survive partial results.
 *   revokes-mid-session — consent is withdrawn between provider calls.
 *
 * EVERYTHING here is synthetic. Brands are FICTIONAL (Wombat Logistics,
 * PlatyPay, Koala Mutual…) — naming a real bank/BNPL/fund anywhere in data a
 * user might see is a compliance violation, and a test enforces it.
 *
 * Generation is pure and seeded (mulberry32 of the persona name; fixed anchor
 * date) — the same persona always yields byte-identical data, which the
 * determinism tests assert.
 */

'use strict';

/** All valid persona names, in the order they appear in the UI selector. */
const PERSONAS = ['grad-hecs-bnpl', 'messy-merchants', 'partial-data', 'revokes-mid-session'];

/** Fixed "today" for fixture generation — never the wall clock. */
const FIXTURE_ANCHOR_DATE = '2026-06-30T00:00:00.000Z';

/** Deterministic 32-bit seed from a string. */
function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 — tiny seedable PRNG, plenty for fixture jitter. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** ISO datetime `days` before the fixture anchor. */
function daysBeforeAnchor(days) {
  const anchorMs = Date.parse(FIXTURE_ANCHOR_DATE);
  return new Date(anchorMs - days * 24 * 60 * 60 * 1000).toISOString();
}

/** Decimal-string amount ("-123.45") from a number of cents. */
function centsToAmount(cents) {
  return (cents / 100).toFixed(2);
}

/**
 * Small builder so every transaction carries the full CDR raw shape.
 * @returns {import('../../twinTypes').CdrTransactionRaw}
 */
function txn({ id, accountId, description, cents, daysAgo, type = 'PAYMENT', mcc = null, status = 'POSTED' }) {
  return {
    transactionId: id,
    accountId,
    status,
    description,
    amount: centsToAmount(cents),
    currency: 'AUD',
    postingDateTime: daysBeforeAnchor(daysAgo),
    merchantName: null,
    merchantCategoryCode: mcc,
    type,
  };
}

// ---------------------------------------------------------------------------
// grad-hecs-bnpl — also the base for revokes-mid-session
// ---------------------------------------------------------------------------

function buildGradHecsBnpl(prefix) {
  const rng = mulberry32(hashString(prefix));
  const txnAcc = `${prefix}-txn`;
  const bnplAcc = `${prefix}-bnpl`;
  const superAcc = `${prefix}-super`;

  const accounts = [
    {
      accountId: txnAcc,
      productCategory: 'TRANS_AND_SAVINGS_ACCOUNTS',
      displayName: 'Everyday Saver',
      providerBrand: 'Koala Mutual',
      maskedNumber: 'xxx-x4821',
      balance: { current: '2143.67', available: '2143.67' },
    },
    {
      accountId: bnplAcc,
      productCategory: 'BUY_NOW_PAY_LATER',
      displayName: 'PlatyPay Account',
      providerBrand: 'PlatyPay',
      maskedNumber: 'xxx-x0917',
      balance: { current: '-247.50' },
    },
    {
      accountId: superAcc,
      productCategory: 'SUPERANNUATION',
      displayName: 'Lifetime Growth Super',
      providerBrand: 'Bilby Super',
      maskedNumber: 'xxx-x5533',
      balance: { current: '8214.90' },
    },
  ];

  const transactions = [];
  let seq = 0;
  const id = () => `${prefix}-t${(seq += 1)}`;

  // Fortnightly salary, ~26 weeks back, with cent-level jitter.
  for (let f = 0; f < 13; f += 1) {
    const jitter = Math.floor(rng() * 900); // up to $9 variation
    transactions.push(
      txn({
        id: id(),
        accountId: txnAcc,
        description: 'WOMBAT LOGISTICS PTY LTD SALARY',
        cents: 261045 + jitter,
        daysAgo: 3 + f * 14,
        type: 'TRANSFER_INCOMING',
      })
    );
    // Employer SG lands in super a couple of days after each pay.
    transactions.push(
      txn({
        id: id(),
        accountId: superAcc,
        description: 'EMPLOYER SG CONTRIBUTION - WOMBAT LOGISTICS',
        cents: 31325,
        daysAgo: 1 + f * 14,
        type: 'TRANSFER_INCOMING',
      })
    );
  }

  // BNPL instalments with IRREGULAR timing: 14, 14, 16, 13 day gaps, then a
  // missed fortnight caught up as a DOUBLE instalment 28 days later.
  const instalmentGaps = [4, 18, 32, 48, 61, 89];
  instalmentGaps.forEach((daysAgo, i) => {
    const isCatchUp = i === 5;
    transactions.push(
      txn({
        id: id(),
        accountId: txnAcc,
        description: `PLATYPAY INSTALMENT ${isCatchUp ? '3-4/4' : `${i + 1}/4`}`,
        cents: isCatchUp ? -8250 : -4125,
        daysAgo,
        type: 'DIRECT_DEBIT',
      })
    );
  });

  // The BNPL account's own ledger: the purchase plus instalment credits.
  transactions.push(
    txn({ id: id(), accountId: bnplAcc, description: 'PURCHASE - SNEAKER VAULT ONLINE', cents: -33000, daysAgo: 95 }),
    txn({ id: id(), accountId: bnplAcc, description: 'INSTALMENT PAYMENT RECEIVED', cents: 4125, daysAgo: 89, type: 'TRANSFER_INCOMING' }),
    txn({ id: id(), accountId: bnplAcc, description: 'INSTALMENT PAYMENT RECEIVED', cents: 8250, daysAgo: 61, type: 'TRANSFER_INCOMING' })
  );

  // HELP repayments: one voluntary BPAY, one explicit HECS-HELP payment.
  transactions.push(
    txn({ id: id(), accountId: txnAcc, description: 'BPAY ATO HELP VOLUNTARY PAYMENT', cents: -50000, daysAgo: 40 }),
    txn({ id: id(), accountId: txnAcc, description: 'ATO HECS-HELP PAYMENT', cents: -25000, daysAgo: 130 })
  );

  // Rent monthly + weekly groceries + assorted small spending.
  for (let m = 0; m < 6; m += 1) {
    transactions.push(
      txn({ id: id(), accountId: txnAcc, description: 'RENT - KOOKABURRA APARTMENTS', cents: -140000, daysAgo: 8 + m * 30, type: 'DIRECT_DEBIT' })
    );
  }
  for (let w = 0; w < 26; w += 1) {
    const spend = 6000 + Math.floor(rng() * 4500);
    transactions.push(
      txn({ id: id(), accountId: txnAcc, description: 'FRESHFIELDS SUPERMARKET', cents: -spend, daysAgo: 2 + w * 7, mcc: '5411' })
    );
  }
  // A pending transaction — real feeds always have one.
  transactions.push(
    txn({ id: id(), accountId: txnAcc, description: 'GALAH COFFEE CO', cents: -620, daysAgo: 0, status: 'PENDING', mcc: '5812' })
  );

  return { accounts, transactions };
}

// ---------------------------------------------------------------------------
// messy-merchants — descriptions built to fool a naive keyword matcher
// ---------------------------------------------------------------------------

function buildMessyMerchants(prefix) {
  const rng = mulberry32(hashString(prefix));
  const txnAcc = `${prefix}-txn`;
  const cardAcc = `${prefix}-card`;

  const accounts = [
    {
      accountId: txnAcc,
      productCategory: 'TRANS_AND_SAVINGS_ACCOUNTS',
      displayName: 'Everyday Account',
      providerBrand: 'Koala Mutual',
      maskedNumber: 'xxx-x7702',
      balance: { current: '641.05', available: '641.05' },
    },
    {
      accountId: cardAcc,
      productCategory: 'CRED_AND_CHRG_CARDS',
      displayName: 'Low Rate Card',
      providerBrand: 'Koala Mutual',
      maskedNumber: 'xxx-x9018',
      balance: { current: '-1850.75' },
    },
  ];

  const transactions = [];
  let seq = 0;
  const id = () => `${prefix}-t${(seq += 1)}`;

  // Irregular casual income — varying amounts and gaps, so the recurrence
  // detector must NOT confidently call it salary.
  const shifts = [
    { cents: 41200, daysAgo: 5 },
    { cents: 28750, daysAgo: 16 },
    { cents: 55300, daysAgo: 24 },
    { cents: 31100, daysAgo: 41 },
  ];
  shifts.forEach((s) =>
    transactions.push(
      txn({ id: id(), accountId: txnAcc, description: 'CASUAL WAGES - QUOLL HOSPITALITY', cents: s.cents, daysAgo: s.daysAgo, type: 'TRANSFER_INCOMING' })
    )
  );

  // The traps.
  transactions.push(
    // Café on Help St — must NOT be read as a HELP repayment.
    txn({ id: id(), accountId: txnAcc, description: 'HELP ST ESPRESSO', cents: -540, daysAgo: 3, mcc: '5812' }),
    txn({ id: id(), accountId: txnAcc, description: 'HELP ST ESPRESSO', cents: -1120, daysAgo: 12, mcc: '5812' }),
    // ATO payment plan — an ATO payment that is NOT identifiably HELP.
    txn({ id: id(), accountId: txnAcc, description: 'ATO PAYMENT PLAN 004521', cents: -15000, daysAgo: 9, type: 'DIRECT_DEBIT' }),
    // A zipline tour, not a BNPL provider.
    txn({ id: id(), accountId: txnAcc, description: 'PAYPORTAL *ZIPLINE ADVENTURE CAIRNS', cents: -18900, daysAgo: 33 }),
    // "SUPA" in a retailer name, not superannuation.
    txn({ id: id(), accountId: txnAcc, description: 'SUPA CHEAP AUTO PARTS', cents: -8420, daysAgo: 21, mcc: '5533' }),
    // A hair salon that happens to contain "HECS".
    txn({ id: id(), accountId: txnAcc, description: 'HECSTATIC HAIR STUDIO', cents: -9500, daysAgo: 27, mcc: '7230' }),
    // Instalment-flavoured wording with no BNPL account behind it.
    txn({ id: id(), accountId: txnAcc, description: 'GYMLIFE INSTALMENT PLAN', cents: -2999, daysAgo: 15, type: 'DIRECT_DEBIT' }),
    // An internal transfer.
    txn({ id: id(), accountId: txnAcc, description: 'TRANSFER TO SAVINGS xx4821', cents: -20000, daysAgo: 6, type: 'TRANSFER_OUTGOING' })
  );

  // Credit card: monthly interest + repayments + purchases.
  for (let m = 0; m < 4; m += 1) {
    transactions.push(
      txn({ id: id(), accountId: cardAcc, description: 'INTEREST CHARGED ON PURCHASES', cents: -2840 - Math.floor(rng() * 400), daysAgo: 10 + m * 30, type: 'INTEREST_PAID' }),
      txn({ id: id(), accountId: cardAcc, description: 'PAYMENT RECEIVED - THANK YOU', cents: 15000, daysAgo: 12 + m * 30, type: 'TRANSFER_INCOMING' }),
      txn({ id: id(), accountId: cardAcc, description: 'DINGO DELIVERY EATS', cents: -3450 - Math.floor(rng() * 2000), daysAgo: 4 + m * 30, mcc: '5814' })
    );
  }

  return { accounts, transactions };
}

// ---------------------------------------------------------------------------
// partial-data — one healthy account, one that the "holder" fails to serve
// ---------------------------------------------------------------------------

function buildPartialData(prefix) {
  const base = buildGradHecsBnpl(prefix);
  const loanAcc = `${prefix}-loan`;
  return {
    accounts: [
      base.accounts[0],
      {
        accountId: loanAcc,
        productCategory: 'PERS_LOANS',
        displayName: 'Personal Loan',
        providerBrand: 'Numbat Finance',
        maskedNumber: 'xxx-x2244',
        balance: { current: '-6420.00' },
      },
    ],
    // Only the transaction account has data; the loan account is listed in
    // `failingAccountIds` and the provider throws for it.
    transactions: base.transactions.filter((t) => t.accountId === `${prefix}-txn`),
    failingAccountIds: [loanAcc],
  };
}

/**
 * @param {string} persona One of PERSONAS.
 * @returns {{ accounts: Array, transactions: Array, failingAccountIds: string[],
 *             revokeAfterFirstTransactionsPage: boolean }}
 */
function getPersonaData(persona) {
  if (!PERSONAS.includes(persona)) {
    throw new Error(`Unknown persona "${persona}" — expected one of ${PERSONAS.join(', ')}`);
  }
  let built;
  if (persona === 'messy-merchants') built = buildMessyMerchants(persona);
  else if (persona === 'partial-data') built = buildPartialData(persona);
  else built = buildGradHecsBnpl(persona); // grad-hecs-bnpl and revokes-mid-session share data
  return {
    accounts: built.accounts,
    transactions: built.transactions,
    failingAccountIds: built.failingAccountIds || [],
    revokeAfterFirstTransactionsPage: persona === 'revokes-mid-session',
  };
}

module.exports = { PERSONAS, FIXTURE_ANCHOR_DATE, getPersonaData, mulberry32, hashString };
