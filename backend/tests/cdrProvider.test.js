/**
 * CDR boundary tests: mock provider flow fidelity, fixture determinism,
 * mid-session revocation, partial data, payload normalization strictness,
 * and the boot-safety accreditation gate.
 */

const provider = require('../services/cdr/mockCdrProvider');
const {
  assertCdrBootSafety,
  getCdrProvider,
  normalizeAccounts,
  normalizeTransactions,
  parseCdrAmount,
  CdrAuthError,
  CdrConsentRevokedError,
  CdrPartialDataError,
  CdrPayloadError,
  CdrBootSafetyError,
  REAL_CDR_CREDENTIAL_VARS,
  _resetProvider,
} = require('../services/cdr');
const { getPersonaData, PERSONAS } = require('../services/cdr/fixtures/personas');

beforeEach(() => {
  provider._reset();
  _resetProvider();
});

// ---------------------------------------------------------------------------
// Consent flow
// ---------------------------------------------------------------------------

describe('mock CDR consent flow', () => {
  it('walks the full handshake: initiate → complete → tokened data call', () => {
    const { consentId, state, authUrl } = provider.initiateConsent({ userId: 'u1', persona: 'grad-hecs-bnpl' });
    expect(state).toBe('awaiting-authorisation');
    expect(authUrl).toContain(consentId);

    const grant = provider.completeConsent({ consentId, authCode: 'code' });
    expect(grant.accessToken).toBeTruthy();
    expect(grant.cdrArrangementId).toBeTruthy();

    const res = provider.listAccounts({ accessToken: grant.accessToken });
    expect(res.data.accounts.length).toBeGreaterThan(0);
    expect(res.meta.totalRecords).toBe(res.data.accounts.length);
  });

  it('rejects unknown consents, missing auth codes and bad tokens', () => {
    expect(() => provider.completeConsent({ consentId: 'nope', authCode: 'x' })).toThrow(CdrAuthError);
    const { consentId } = provider.initiateConsent({ userId: 'u1' });
    expect(() => provider.completeConsent({ consentId })).toThrow(CdrAuthError);
    expect(() => provider.listAccounts({ accessToken: 'garbage' })).toThrow(CdrAuthError);
  });

  it('rejects an unknown persona at initiation', () => {
    expect(() => provider.initiateConsent({ userId: 'u1', persona: 'not-a-persona' })).toThrow(CdrAuthError);
  });

  it('refuses data calls after revocation', () => {
    const { consentId } = provider.initiateConsent({ userId: 'u1' });
    const grant = provider.completeConsent({ consentId, authCode: 'x' });
    provider.revokeConsent({ cdrArrangementId: grant.cdrArrangementId });
    expect(() => provider.listAccounts({ accessToken: grant.accessToken })).toThrow(CdrConsentRevokedError);
  });
});

// ---------------------------------------------------------------------------
// Fixtures: determinism, CDR shape, pagination, edge personas
// ---------------------------------------------------------------------------

describe('persona fixtures', () => {
  it('are deterministic — the same persona yields byte-identical data', () => {
    for (const persona of PERSONAS) {
      expect(getPersonaData(persona)).toEqual(getPersonaData(persona));
    }
  });

  it('carry the CDR raw shape: string decimal amounts, ISO datetimes, envelope fields', () => {
    const { transactions } = getPersonaData('grad-hecs-bnpl');
    expect(transactions.length).toBeGreaterThan(50);
    for (const t of transactions) {
      expect(typeof t.amount).toBe('string');
      expect(t.amount).toMatch(/^-?\d+\.\d{2}$/);
      expect(new Date(t.postingDateTime).toISOString()).toBe(t.postingDateTime);
      expect(t.currency).toBe('AUD');
      expect(['POSTED', 'PENDING']).toContain(t.status);
    }
  });

  it('paginates transactions and the pages union to totalRecords', () => {
    const { consentId } = provider.initiateConsent({ userId: 'u1', persona: 'grad-hecs-bnpl' });
    const grant = provider.completeConsent({ consentId, authCode: 'x' });
    const accountId = 'grad-hecs-bnpl-txn';

    const page1 = provider.listTransactions({ accessToken: grant.accessToken, accountId, page: 1 });
    expect(page1.meta.totalPages).toBeGreaterThan(1);
    expect(page1.links.next).not.toBeNull();

    const seen = new Set();
    for (let p = 1; p <= page1.meta.totalPages; p += 1) {
      const res = provider.listTransactions({ accessToken: grant.accessToken, accountId, page: p });
      res.data.transactions.forEach((t) => seen.add(t.transactionId));
    }
    expect(seen.size).toBe(page1.meta.totalRecords);
  });

  it('revokes-mid-session: the call AFTER the first transactions page fails with CdrConsentRevokedError', () => {
    const { consentId } = provider.initiateConsent({ userId: 'u1', persona: 'revokes-mid-session' });
    const grant = provider.completeConsent({ consentId, authCode: 'x' });
    const accountId = 'revokes-mid-session-txn';

    // First page is served fine…
    const page1 = provider.listTransactions({ accessToken: grant.accessToken, accountId, page: 1 });
    expect(page1.data.transactions.length).toBeGreaterThan(0);
    // …then the consumer has withdrawn consent.
    expect(() => provider.listTransactions({ accessToken: grant.accessToken, accountId, page: 2 })).toThrow(CdrConsentRevokedError);
  });

  it('partial-data: the failing account throws CdrPartialDataError naming the account', () => {
    const { consentId } = provider.initiateConsent({ userId: 'u1', persona: 'partial-data' });
    const grant = provider.completeConsent({ consentId, authCode: 'x' });
    const failing = getPersonaData('partial-data').failingAccountIds[0];

    try {
      provider.listTransactions({ accessToken: grant.accessToken, accountId: failing });
      throw new Error('expected CdrPartialDataError');
    } catch (error) {
      expect(error).toBeInstanceOf(CdrPartialDataError);
      expect(error.accountId).toBe(failing);
    }
    // The healthy account still serves.
    const ok = provider.listTransactions({ accessToken: grant.accessToken, accountId: 'partial-data-txn' });
    expect(ok.data.transactions.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Boundary normalization — malformed payloads throw, never coerce
// ---------------------------------------------------------------------------

describe('boundary normalization', () => {
  it('converts CDR decimal strings to whole signed dollars', () => {
    expect(parseCdrAmount('-123.45', 'x')).toBe(-123);
    expect(parseCdrAmount('123.55', 'x')).toBe(124);
    expect(parseCdrAmount('0.00', 'x')).toBe(0);
  });

  it('rejects non-decimal amounts instead of coercing', () => {
    for (const bad of ['12,000.00', 'NaN', '', '1e5', '12.345', null, 42]) {
      expect(() => parseCdrAmount(bad, 'x')).toThrow(CdrPayloadError);
    }
  });

  it('normalizes well-formed fixture payloads end to end', () => {
    const { accounts, transactions } = getPersonaData('grad-hecs-bnpl');
    const normAccounts = normalizeAccounts(accounts);
    for (const a of normAccounts) expect(Number.isInteger(a.balance)).toBe(true);
    const normTxns = normalizeTransactions(transactions);
    for (const t of normTxns) {
      expect(Number.isInteger(t.amount)).toBe(true);
      expect(typeof t.description).toBe('string');
    }
  });

  it('throws CdrPayloadError on missing fields, wrong types and unknown categories', () => {
    expect(() => normalizeAccounts([{ accountId: 'a' }])).toThrow(CdrPayloadError);
    expect(() =>
      normalizeAccounts([{ accountId: 'a', productCategory: 'MYSTERY', displayName: 'x', balance: { current: '1.00' } }])
    ).toThrow(CdrPayloadError);
    expect(() => normalizeTransactions([{ transactionId: 't1' }])).toThrow(CdrPayloadError);
    expect(() => normalizeTransactions('not-an-array')).toThrow(CdrPayloadError);
  });
});

// ---------------------------------------------------------------------------
// Boot safety — the accreditation gate
// ---------------------------------------------------------------------------

describe('assertCdrBootSafety', () => {
  it('passes a plain mock-mode environment', () => {
    expect(() => assertCdrBootSafety({})).not.toThrow();
    expect(() => assertCdrBootSafety({ CDR_MODE: 'mock' })).not.toThrow();
  });

  it.each(REAL_CDR_CREDENTIAL_VARS)('refuses to boot when %s is set without the accreditation flag', (name) => {
    expect(() => assertCdrBootSafety({ [name]: 'real-looking-secret' })).toThrow(CdrBootSafetyError);
  });

  it('refuses CDR_MODE=real without the accreditation flag', () => {
    expect(() => assertCdrBootSafety({ CDR_MODE: 'real' })).toThrow(CdrBootSafetyError);
  });

  it('accepts credentials once CDR_ACCREDITED=true (the flag a human sets post-accreditation)', () => {
    expect(() =>
      assertCdrBootSafety({ CDR_CLIENT_ID: 'id', CDR_CLIENT_SECRET: 's', CDR_ACCREDITED: 'true', CDR_MODE: 'real' })
    ).not.toThrow();
  });

  it('treats any non-"true" flag value as unaccredited', () => {
    expect(() => assertCdrBootSafety({ CDR_CLIENT_SECRET: 's', CDR_ACCREDITED: '1' })).toThrow(CdrBootSafetyError);
    expect(() => assertCdrBootSafety({ CDR_CLIENT_SECRET: 's', CDR_ACCREDITED: 'TRUE' })).toThrow(CdrBootSafetyError);
  });
});

describe('getCdrProvider', () => {
  it('returns the mock provider by default', () => {
    delete process.env.CDR_MODE;
    expect(getCdrProvider()).toBe(provider);
  });

  it('stops at the accreditation boundary: real mode is a hard error even when accredited', () => {
    process.env.CDR_MODE = 'real';
    process.env.CDR_ACCREDITED = 'true';
    try {
      expect(() => getCdrProvider()).toThrow(/not implemented/i);
    } finally {
      delete process.env.CDR_MODE;
      delete process.env.CDR_ACCREDITED;
    }
  });
});
