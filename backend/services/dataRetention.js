const { Op } = require('sequelize');

function boundedDays(value, fallback, maximum = 3650) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(maximum, Math.floor(parsed)) : fallback;
}

async function purgeExpiredData(now = new Date()) {
  const { ProductEvent, GuardianConsentRequest } = require('../models');
  const { purgeExpiredAIHistory } = require('./aiHistory');
  const productEventDays = boundedDays(process.env.PRODUCT_EVENT_RETENTION_DAYS, 365);
  const guardianRequestDays = boundedDays(process.env.GUARDIAN_REQUEST_RETENTION_DAYS, 90);
  const dayMs = 24 * 60 * 60 * 1000;

  const [aiInteractions, productEvents, guardianRequests] = await Promise.all([
    purgeExpiredAIHistory(now),
    ProductEvent.destroy({
      where: { occurredAt: { [Op.lte]: new Date(now.getTime() - productEventDays * dayMs) } },
    }),
    GuardianConsentRequest.destroy({
      where: { expiresAt: { [Op.lte]: new Date(now.getTime() - guardianRequestDays * dayMs) } },
    }),
  ]);

  return { aiInteractions, productEvents, guardianRequests };
}

module.exports = { boundedDays, purgeExpiredData };
