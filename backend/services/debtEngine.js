/**
 * debtEngine — the single source of truth for debt sequencing math in Caplet.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * Generic snowball/avalanche calculators either ignore HECS/HELP or, worse,
 * treat it as if it behaved like a credit card. It does not. This module models
 * the difference explicitly so the advice it produces is correct rather than
 * plausible-but-wrong.
 *
 * HARD CONSTRAINTS (read before editing)
 * --------------------------------------
 * 1. DETERMINISTIC & AUDITABLE. Same input → same output, every time. No AI/LLM,
 *    no network, no DB, no Date.now()/random. Pure functions only. The English
 *    explanations are TEMPLATE STRINGS selected by which branch of the logic
 *    fired — never model-generated. This is a regulatory requirement: Caplet has
 *    no AFSL, so nothing here may read as dynamically-tailored product advice.
 * 2. CALCULATOR, NOT ADVISER. Every string compares costs ("debt X costs more
 *    than debt Y"); none issues a directive ("you should pay X"). No bank, fund,
 *    product, or provider name appears anywhere.
 * 3. HECS IS NOT A CREDIT CARD. It is indexed once a year (1 June), not charged
 *    monthly-compounding interest; its compulsory repayment is income-contingent
 *    (derived, not chosen); it has no fixed term. HECS is handled on its own
 *    branch below and is NEVER pushed into the avalanche sort as a low-rate row.
 *
 * Money is handled as whole AUD dollars (matching UserFinancialProfile). Display
 * figures are rounded to whole dollars; the raw closed-form payoff numbers are
 * left unrounded so they stay bit-identical to the frontend copy in
 * src/lib/debtMath.js (the two are pinned together by shared parity vectors — see
 * STANDARD_PAYOFF_PARITY_CASES and the tests that assert them on both sides).
 */

'use strict';

// ---------------------------------------------------------------------------
// HECS / HELP constants — VERIFY AGAINST CURRENT ATO FIGURES BEFORE SHIPPING.
// ---------------------------------------------------------------------------

/**
 * 2025-26 HELP/HECS compulsory-repayment bands (the marginal system introduced
 * by the 2025 reform). Repayment is calculated MARGINALLY: each band's rate
 * applies only to the portion of repayment income that falls within that band —
 * NOT a single rate applied to the whole income (that flat-rate reading is the
 * classic bug in generic tools).
 *
 *   below $67,000            → nil
 *   $67,000 – $125,000       → 15c per dollar over $67,000
 *   above $125,000           → $8,700 (15% of the $58,000 band) + 17c per dollar over $125,000
 *
 * Data-driven so a future year's thresholds/rates are a one-line edit. The exact
 * numbers below are a JUDGMENT CALL a human must reconcile with the ATO's current
 * published schedule before this reaches real users.
 */
const HECS_REPAYMENT_BANDS = [
  { min: 0, rate: 0 },
  { min: 67000, rate: 0.15 },
  { min: 125000, rate: 0.17 },
];

/**
 * Default assumed annual indexation rate, as a fraction. HELP was indexed 3.2%
 * on 1 June 2025 (indexation is the lower of CPI and the Wage Price Index). This
 * is only a default for projections — the caller can override it — but the value
 * itself is a JUDGMENT CALL to re-check each year.
 */
const DEFAULT_INDEXATION_RATE = 0.032;

/** Optional categorisation of an ordinary (non-HECS) debt, for UI labelling. */
const VALID_DEBT_TYPES = ['credit_card', 'bnpl', 'personal_loan', 'other'];

/**
 * Shown by the route/UI so the "calculator, not advice" framing travels with the
 * numbers. Kept here so there is one canonical wording.
 */
const CALCULATOR_DISCLAIMER =
  'This is a calculator that compares the cost of your debts. It is general ' +
  'information, not financial advice, and does not account for your full ' +
  'circumstances. Figures rely on the assumptions you enter.';

// ---------------------------------------------------------------------------
// Small pure helpers
// ---------------------------------------------------------------------------

const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Whole-dollar, locale-free money formatter for template strings ("$1,234"). */
const money = (n) =>
  '$' + Math.round(toNumber(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/** Trim trailing zeros from a percentage for display ("19.9", "0", "6.5"). */
const pct = (rate) => `${Number(toNumber(rate).toFixed(3))}%`;

const normalizeDebtType = (t) => (VALID_DEBT_TYPES.includes(t) ? t : 'other');

// ---------------------------------------------------------------------------
// 1. Standard (interest-charging) debt payoff — the closed-form used by
//    CreditCardPayoff.jsx, extracted so there is one authoritative copy.
// ---------------------------------------------------------------------------

/**
 * Months to clear an interest-charging debt held at a constant monthly payment,
 * plus the interest that costs. This mirrors CreditCardPayoff.jsx exactly, with
 * one addition: a 0%-interest branch (BNPL is commonly 0%; the component rejects
 * that case, but the engine must handle it because BNPL is a first-class debt
 * type here).
 *
 * @returns {{ months:number, totalPaid:number, totalInterest:number,
 *             monthlyInterestAtStart:number, neverPayoff:boolean }}
 *   months/totalPaid/totalInterest are Infinity when the payment can't cover the
 *   interest (neverPayoff=true). Values are intentionally left unrounded so they
 *   stay identical to the frontend copy.
 */
function calculateStandardDebtPayoff({ balance, annualRate, monthlyPayment }) {
  const B = Math.max(0, toNumber(balance));
  const ratePct = Math.max(0, toNumber(annualRate));
  const P = Math.max(0, toNumber(monthlyPayment));
  const r = ratePct / 100 / 12; // monthly rate
  const monthlyInterestAtStart = B * r;

  if (B <= 0) {
    return { months: 0, totalPaid: 0, totalInterest: 0, monthlyInterestAtStart: 0, neverPayoff: false };
  }

  // 0% interest: linear payoff, no interest cost. The whole balance is repaid.
  if (r === 0) {
    if (P <= 0) {
      return { months: Infinity, totalPaid: Infinity, totalInterest: Infinity, monthlyInterestAtStart: 0, neverPayoff: true };
    }
    return { months: Math.ceil(B / P), totalPaid: B, totalInterest: 0, monthlyInterestAtStart: 0, neverPayoff: false };
  }

  // Payment doesn't even cover the first month's interest → never pays off.
  if (P <= monthlyInterestAtStart) {
    return { months: Infinity, totalPaid: Infinity, totalInterest: Infinity, monthlyInterestAtStart, neverPayoff: true };
  }

  const months = Math.ceil(-Math.log(1 - (B * r) / P) / Math.log(1 + r));
  const totalPaid = P * months;
  const totalInterest = totalPaid - B;
  return { months, totalPaid, totalInterest, monthlyInterestAtStart, neverPayoff: false };
}

// ---------------------------------------------------------------------------
// 2. HECS / HELP — its own calculation path (NOT the monthly-compounding loop).
// ---------------------------------------------------------------------------

/**
 * Compulsory repayment for the year, derived from repayment income via the
 * marginal band table. Income-contingent — the user does not choose this.
 *
 * NB "repayment income" is not gross salary; the ATO adds reportable fringe
 * benefits, reportable super, net investment losses and exempt foreign income.
 * Callers pass the closest figure they have (we approximate with annual income)
 * and the UI labels the input accordingly.
 */
function hecsCompulsoryRepayment(repaymentIncome) {
  const income = Math.max(0, toNumber(repaymentIncome));
  let repayment = 0;
  for (let i = 0; i < HECS_REPAYMENT_BANDS.length; i += 1) {
    const band = HECS_REPAYMENT_BANDS[i];
    const upper = HECS_REPAYMENT_BANDS[i + 1] ? HECS_REPAYMENT_BANDS[i + 1].min : Infinity;
    if (income > band.min) {
      repayment += (Math.min(income, upper) - band.min) * band.rate;
    }
  }
  return Math.round(repayment);
}

/**
 * One HECS/HELP year, as a pure step function. This is the SINGLE home for the
 * within-year mechanics — calculateHecsProjection's deterministic loop and the
 * Financial Twin's Monte Carlo trials (services/twinProjection.js) both call it,
 * so the two can never disagree about how a HELP year works.
 *
 * Order of operations (a JUDGMENT CALL, aligned with the 2025 indexation reform
 * that credits repayments made during the year BEFORE indexation, so borrowers
 * aren't indexed on amounts they've effectively repaid):
 *   1. subtract voluntary repayment      (user-chosen, optional)
 *   2. subtract compulsory repayment     (income-contingent, derived)
 *   3. apply indexation to the remainder (once, on 1 June)
 * A human should confirm this ordering against the ATO's current mechanics.
 *
 * @param {{ openingBalance:number, repaymentIncome:number,
 *           indexationRate:number, voluntaryAnnual?:number }} args
 *   indexationRate is a FRACTION (0.032, not 3.2).
 * @returns {{ voluntaryApplied:number, compulsoryApplied:number,
 *             indexationApplied:number, closingBalance:number }}
 */
function hecsYearStep({ openingBalance, repaymentIncome, indexationRate, voluntaryAnnual = 0 }) {
  const bal = Math.max(0, toNumber(openingBalance));
  const idx = Math.max(0, toNumber(indexationRate));
  const voluntary = Math.max(0, toNumber(voluntaryAnnual));
  const compulsory = hecsCompulsoryRepayment(repaymentIncome);

  const voluntaryApplied = Math.min(voluntary, bal);
  const afterVoluntary = Math.max(0, bal - voluntary);
  const compulsoryApplied = Math.min(compulsory, afterVoluntary);
  const afterCompulsory = Math.max(0, afterVoluntary - compulsory);
  const indexationApplied = Math.round(afterCompulsory * idx);
  const closingBalance = afterCompulsory + indexationApplied;

  return { voluntaryApplied, compulsoryApplied, indexationApplied, closingBalance };
}

/**
 * Projects a HELP balance forward. Unlike a credit card, growth is indexation
 * applied once per year — NOT monthly compounding. Each year is one
 * hecsYearStep (see above for the order of operations), then repayment income
 * grows for the following year.
 *
 * @returns {{ startBalance:number, compulsoryRepayment:number,
 *             projectedBalanceAfterIndexation:number, projection:Array }}
 */
function calculateHecsProjection({
  balance,
  repaymentIncome,
  indexationRate = DEFAULT_INDEXATION_RATE,
  voluntaryAnnual = 0,
  incomeGrowthRate = 0,
  years = 5,
}) {
  const startBalance = Math.max(0, Math.round(toNumber(balance)));
  const idx = Math.max(0, toNumber(indexationRate)); // fraction
  const voluntary = Math.max(0, Math.round(toNumber(voluntaryAnnual)));
  const incomeGrowth = toNumber(incomeGrowthRate);
  const horizon = Math.max(0, Math.min(50, Math.floor(toNumber(years) || 0)));

  // "Compulsory repayment for the year" is a headline figure derived from the
  // current repayment income, independent of the balance.
  const compulsoryRepayment = hecsCompulsoryRepayment(repaymentIncome);

  const projection = [];
  let bal = startBalance;
  let income = Math.max(0, Math.round(toNumber(repaymentIncome)));

  for (let year = 1; year <= horizon && bal > 0; year += 1) {
    const step = hecsYearStep({
      openingBalance: bal,
      repaymentIncome: income,
      indexationRate: idx,
      voluntaryAnnual: voluntary,
    });

    projection.push({
      year,
      openingBalance: bal,
      repaymentIncome: income,
      voluntaryRepayment: step.voluntaryApplied,
      compulsoryRepayment: step.compulsoryApplied,
      indexationApplied: step.indexationApplied,
      closingBalance: step.closingBalance,
    });

    bal = step.closingBalance;
    income = Math.max(0, Math.round(income * (1 + incomeGrowth)));
  }

  const projectedBalanceAfterIndexation = projection.length ? projection[0].closingBalance : startBalance;

  return { startBalance, compulsoryRepayment, projectedBalanceAfterIndexation, projection };
}

// ---------------------------------------------------------------------------
// 3. sequenceDebts — the ranking. Non-HECS debts get the avalanche default;
//    HECS is compared explicitly and reported separately.
// ---------------------------------------------------------------------------

/**
 * @param {Object}   args
 * @param {Array}    args.debts               [{ label, balance, rate, type? }] — ordinary debts.
 * @param {Object?}  args.hecsProfile         { balance, repaymentIncome, indexationRate?, voluntaryAnnual?, incomeGrowthRate? } or null.
 * @param {number}   args.extraMonthlyAmount  spare monthly $ the user is deciding how to direct (echoed for context).
 * @returns {{ currency, extraMonthlyAmount, standardRanking, order, hecs, summary, disclaimer }}
 */
function sequenceDebts({ debts = [], hecsProfile = null, extraMonthlyAmount = 0 } = {}) {
  const extra = Math.max(0, Math.round(toNumber(extraMonthlyAmount)));

  // --- Normalise & keep only ordinary debts that actually carry a balance. ---
  const standardDebts = (Array.isArray(debts) ? debts : [])
    .filter((d) => d && typeof d === 'object')
    .map((d) => ({
      label: String(d.label || 'Debt').slice(0, 80),
      balance: Math.max(0, Math.round(toNumber(d.balance))),
      rate: Math.max(0, toNumber(d.rate)),
      type: normalizeDebtType(d.type),
    }))
    .filter((d) => d.balance > 0);

  // --- Avalanche default: highest cost (rate) first; tie-break smaller balance
  //     (a quicker clear). This is the mathematically defensible default: a
  //     dollar aimed at the highest-rate debt removes the most interest. ---
  const standardRanking = [...standardDebts]
    .sort((a, b) => b.rate - a.rate || a.balance - b.balance)
    .map((d, i) => {
      const monthlyInterest = (d.balance * (d.rate / 100)) / 12;
      const annualInterest = d.balance * (d.rate / 100);
      let reason;
      if (d.rate === 0) {
        reason =
          `Charges no interest, so on interest cost alone it is the lowest ` +
          `priority — any interest-charging debt removes more cost per dollar. ` +
          (d.type === 'bnpl'
            ? `(This compares interest only; a BNPL due date or late fee is a ` +
              `separate risk this calculator does not model.)`
            : `(Interest cost only; any fees are not modelled.)`);
      } else if (i === 0 && standardDebts.length > 1) {
        reason =
          `At ${pct(d.rate)} this is the most expensive debt to carry — about ` +
          `${money(monthlyInterest)} a month (${money(annualInterest)} a year) in ` +
          `interest at its current balance. A dollar directed here removes more ` +
          `interest cost than anywhere else on this list.`;
      } else {
        reason =
          `At ${pct(d.rate)} it costs about ${money(monthlyInterest)} a month ` +
          `(${money(annualInterest)} a year) in interest while the balance remains.`;
      }
      return { ...d, rank: i + 1, monthlyInterest: Math.round(monthlyInterest), annualInterest: Math.round(annualInterest), reason };
    });

  // --- HECS: separate branch. We compare its indexation rate against the
  //     cheapest ordinary debt. This explicit comparison — not a generic sort —
  //     is what keeps the tool correct about HECS. ---
  let hecs = null;
  const hecsBalance = hecsProfile ? Math.max(0, Math.round(toNumber(hecsProfile.balance))) : 0;

  if (hecsProfile && hecsBalance > 0) {
    const indexationRate = hecsProfile.indexationRate != null ? Math.max(0, toNumber(hecsProfile.indexationRate)) : DEFAULT_INDEXATION_RATE;
    // Round for display so e.g. 0.035 → 3.5 rather than 3.5000000000000004.
    const indexationPct = Number((indexationRate * 100).toFixed(3));
    const projection = calculateHecsProjection({
      balance: hecsBalance,
      repaymentIncome: hecsProfile.repaymentIncome,
      indexationRate,
      voluntaryAnnual: hecsProfile.voluntaryAnnual,
      incomeGrowthRate: hecsProfile.incomeGrowthRate,
    });

    const rates = standardDebts.map((d) => d.rate);
    const cheapestOtherRate = rates.length ? Math.min(...rates) : null;

    // worthConsidering:
    //   null  → no ordinary debt to compare against ("it depends" — the only
    //           comparison left is vs savings/investment return, which we won't
    //           make on the user's behalf).
    //   false → every ordinary debt costs at least as much as HECS grows, so
    //           those reduce more total cost per dollar than voluntary HECS.
    //   true  → at least one ordinary debt is cheaper than HECS indexation, so a
    //           voluntary HECS dollar removes marginally more cost than paying
    //           that one down — stated as information, with HECS's soft-cost
    //           caveat attached.
    let worthConsidering;
    let voluntaryMessage;
    if (cheapestOtherRate === null) {
      worthConsidering = null;
      voluntaryMessage =
        `You have no interest-charging debts. HECS grows only by about ` +
        `${pct(indexationPct)} once a year and never compounds monthly, and ` +
        `your compulsory repayments already reduce it. Whether an extra ` +
        `voluntary repayment reduces more cost than leaving that money in ` +
        `savings depends on your savings rate versus that ~${pct(indexationPct)} ` +
        `— a comparison, not a recommendation.`;
    } else if (indexationPct <= cheapestOtherRate) {
      worthConsidering = false;
      voluntaryMessage =
        `Every one of your other debts costs at least ${pct(cheapestOtherRate)} a ` +
        `year — more than HECS's ~${pct(indexationPct)} indexation — so a dollar ` +
        `put toward them removes more total cost than a voluntary HECS repayment ` +
        `would. HECS is also indexed just once a year and its compulsory ` +
        `repayments already chip away at it.`;
    } else {
      worthConsidering = true;
      voluntaryMessage =
        `HECS is indexed at about ${pct(indexationPct)} a year, which is higher ` +
        `than your cheapest other debt at ${pct(cheapestOtherRate)}. On cost ` +
        `alone, a voluntary HECS dollar removes marginally more than paying that ` +
        `one down — but HECS grows only once a year, its repayments are ` +
        `income-contingent, and any remaining balance is written off eventually, ` +
        `so the real difference is small. Presented as information, not advice.`;
    }

    hecs = {
      balance: hecsBalance,
      indexationRate,
      indexationPct,
      repaymentIncome: Math.max(0, Math.round(toNumber(hecsProfile.repaymentIncome))),
      compulsoryRepayment: projection.compulsoryRepayment,
      projectedBalanceAfterIndexation: projection.projectedBalanceAfterIndexation,
      projection: projection.projection,
      cheapestOtherRate,
      worthConsidering,
      message: voluntaryMessage,
    };
  }

  // --- Combined recommended order for spare money. HECS's slot is DERIVED from
  //     the explicit comparison above (partition around its indexation rate),
  //     not from throwing it into the sort as a fake low-rate row. Its reason
  //     text always states that it is indexation, not interest. ---
  const order = standardRanking.map((d) => ({
    kind: 'standard',
    label: d.label,
    type: d.type,
    displayRate: d.rate,
    reason: d.reason,
  }));

  if (hecs) {
    const hecsEntry = {
      kind: 'hecs',
      label: 'HECS/HELP',
      type: 'hecs',
      displayRate: hecs.indexationPct,
      reason:
        hecs.worthConsidering === true
          ? `Grows by ~${pct(hecs.indexationPct)} indexation once a year — higher ` +
            `than your cheapest other debt, so on cost it edges ahead of that one. ` +
            `Still indexation, not compounding interest, and repayments are ` +
            `income-contingent.`
          : `Grows by ~${pct(hecs.indexationPct)} indexation once a year, never ` +
            `compounds monthly, and compulsory repayments already reduce it — so ` +
            `it rarely costs more than debts that charge real monthly interest.`,
    };

    if (hecs.worthConsidering === true && hecs.cheapestOtherRate !== null) {
      // Place HECS above only the ordinary debts cheaper than its indexation.
      const idx = order.findIndex((o) => o.displayRate < hecs.indexationPct);
      if (idx === -1) order.push(hecsEntry);
      else order.splice(idx, 0, hecsEntry);
    } else {
      // Rarely the priority → sits at the end of the spare-money order.
      order.push(hecsEntry);
    }
  }

  // --- Top-line, cost-comparison summary. ---
  let summary;
  if (standardRanking.length === 0 && !hecs) {
    summary = 'No debts entered yet. Add a debt or your HECS balance to compare their costs.';
  } else if (standardRanking.length === 0 && hecs) {
    summary =
      `You have no interest-charging debts. HECS grows only by about ` +
      `${pct(hecs.indexationPct)} once a year — see the note below on how that ` +
      `compares with leaving spare money in savings.`;
  } else if (hecs) {
    const top = standardRanking[0];
    summary =
      `${top.label} at ${pct(top.rate)} is your most expensive debt to carry. ` +
      (hecs.worthConsidering === false
        ? `Every listed debt costs more per year than HECS's ~${pct(hecs.indexationPct)} indexation, so those reduce more total cost first; HECS is shown separately.`
        : `HECS is compared separately below, because it is indexed once a year rather than charged monthly interest.`);
  } else {
    const top = standardRanking[0];
    summary =
      standardRanking.length > 1
        ? `${top.label} at ${pct(top.rate)} costs the most to carry, so a spare dollar removes the most interest there; the rest follow in order of cost.`
        : `${top.label} at ${pct(top.rate)} is your only interest-charging debt here — it costs about ${money(top.monthlyInterest)} a month while it remains.`;
  }

  return {
    currency: 'AUD',
    extraMonthlyAmount: extra,
    standardRanking,
    order,
    hecs,
    summary,
    disclaimer: CALCULATOR_DISCLAIMER,
  };
}

// ---------------------------------------------------------------------------
// Parity vectors — pin this module's payoff math to the frontend copy in
// src/lib/debtMath.js. Both the Jest test here and the Vitest test there assert
// standard-payoff output equals these exact values, so the two implementations
// across the ESM/CJS split cannot drift silently.
// ---------------------------------------------------------------------------

const STANDARD_PAYOFF_PARITY_CASES = [
  { input: { balance: 5000, annualRate: 19.99, monthlyPayment: 200 }, expected: { months: 33, totalPaid: 6600, totalInterest: 1600, neverPayoff: false } },
  { input: { balance: 12000, annualRate: 6.5, monthlyPayment: 400 }, expected: { months: 33, totalPaid: 13200, totalInterest: 1200, neverPayoff: false } },
  { input: { balance: 1200, annualRate: 0, monthlyPayment: 100 }, expected: { months: 12, totalPaid: 1200, totalInterest: 0, neverPayoff: false } },
  { input: { balance: 3000, annualRate: 24, monthlyPayment: 50 }, expected: { neverPayoff: true } },
];

module.exports = {
  HECS_REPAYMENT_BANDS,
  DEFAULT_INDEXATION_RATE,
  VALID_DEBT_TYPES,
  CALCULATOR_DISCLAIMER,
  STANDARD_PAYOFF_PARITY_CASES,
  hecsCompulsoryRepayment,
  hecsYearStep,
  calculateHecsProjection,
  calculateStandardDebtPayoff,
  sequenceDebts,
};
