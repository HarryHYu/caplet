/**
 * Shared email identity rules.
 *
 * Gmail ignores dots and "+" subaddressing in the local part, so
 * `a.b@gmail.com`, `ab@gmail.com` and `ab+school@googlemail.com` are all the
 * SAME mailbox. Accounts are therefore stored canonicalised, and every place
 * that decides "is this email already taken?" has to ask the same question —
 * registration, profile email changes and password reset alike. Comparing raw
 * strings anywhere would let a second, canonically-duplicate account through,
 * after which a later login or reset resolves to an arbitrary one of them.
 */
const { Op, fn, col, where } = require('sequelize');
const User = require('../models/User');

const normalizeEmailInput = (email = '') => String(email).trim().toLowerCase();

const splitEmail = (normalizedEmail) => {
  const [local, domain] = normalizedEmail.split('@');
  return {
    local,
    domain: domain?.toLowerCase()
  };
};

const isGmailDomain = (domain) => domain === 'gmail.com' || domain === 'googlemail.com';

const toCanonicalEmail = (normalizedEmail) => {
  const { local, domain } = splitEmail(normalizedEmail);
  if (!local || !domain) return normalizedEmail;

  // Gmail addresses ignore dots and "+" subaddressing in the local part.
  if (isGmailDomain(domain)) {
    const baseLocal = local.split('+')[0];
    const compactLocal = baseLocal.replace(/\./g, '');
    return `${compactLocal}@gmail.com`;
  }

  return normalizedEmail;
};

const normalizeEmailForStorage = (email) => toCanonicalEmail(normalizeEmailInput(email));

const findUserByEmailVariants = async (email) => {
  const normalizedEmail = normalizeEmailInput(email);
  if (!normalizedEmail.includes('@')) return null;

  const exactUser = await User.findOne({
    where: where(fn('LOWER', col('email')), normalizedEmail)
  });
  if (exactUser) {
    return exactUser;
  }

  const { domain } = splitEmail(normalizedEmail);
  if (!isGmailDomain(domain)) return null;

  const canonicalEmail = toCanonicalEmail(normalizedEmail);
  const gmailUsers = await User.findAll({
    where: {
      [Op.or]: [
        where(fn('LOWER', col('email')), { [Op.like]: '%@gmail.com' }),
        where(fn('LOWER', col('email')), { [Op.like]: '%@googlemail.com' })
      ]
    }
  });

  return gmailUsers.find((candidate) => {
    const candidateCanonical = toCanonicalEmail(normalizeEmailInput(candidate.email));
    return candidateCanonical === canonicalEmail;
  }) || null;
};

module.exports = {
  normalizeEmailInput,
  splitEmail,
  isGmailDomain,
  toCanonicalEmail,
  normalizeEmailForStorage,
  findUserByEmailVariants,
};
