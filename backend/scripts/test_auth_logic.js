const { sequelize, User } = require('../models');
const { Op, fn, col, where } = require('sequelize');

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

    if (isGmailDomain(domain)) {
        const baseLocal = local.split('+')[0];
        const compactLocal = baseLocal.replace(/\./g, '');
        return `${compactLocal}@gmail.com`;
    }

    return normalizedEmail;
};

const findUserByEmailVariants = async (email) => {
    const normalizedEmail = normalizeEmailInput(email);
    if (!normalizedEmail.includes('@')) return null;

    console.log('Searching for exact match:', normalizedEmail);
    const exactUser = await User.findOne({
        where: where(fn('LOWER', col('email')), normalizedEmail)
    });
    if (exactUser) {
        console.log('Exact match found:', exactUser.email);
        return exactUser;
    }

    const { domain } = splitEmail(normalizedEmail);
    if (!isGmailDomain(domain)) return null;

    const canonicalEmail = toCanonicalEmail(normalizedEmail);
    console.log('Searching for Gmail variants, canonical:', canonicalEmail);

    const gmailUsers = await User.findAll({
        where: {
            [Op.or]: [
                where(fn('LOWER', col('email')), { [Op.like]: '%@gmail.com' }),
                where(fn('LOWER', col('email')), { [Op.like]: '%@googlemail.com' })
            ]
        }
    });

    console.log('Found', gmailUsers.length, 'total Gmail users');

    const match = gmailUsers.find((candidate) => {
        const candidateCanonical = toCanonicalEmail(normalizeEmailInput(candidate.email));
        return candidateCanonical === canonicalEmail;
    });

    if (match) {
        console.log('Variant match found:', match.email);
    } else {
        console.log('No match found');
    }
    return match || null;
};

async function test() {
    try {
        await sequelize.authenticate();
        console.log('DB connected');

        // Test with codexlogintest@gmail.com which we know is in the DB
        await findUserByEmailVariants('codexlogintest@gmail.com');
        await findUserByEmailVariants('CODEXLOGINTEST@gmail.com');
        await findUserByEmailVariants('codex.login.test@gmail.com');

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

test();
