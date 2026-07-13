const { Op } = require('sequelize');

const clean = (value, limit = 500) => String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit) || null;

async function recordAIInteraction(input) {
  const { AIInteraction, UserPrivacyPreference } = require('../models');
  if (input.userId) {
    const preference = await UserPrivacyPreference.findOne({ where: { userId: input.userId } });
    if (!preference || preference.aiHistoryEnabled !== true) return null;
    const retentionDays = Math.max(1, Math.min(3650, Number(preference.aiRetentionDays || 90)));
    input.expiresAt = input.expiresAt || new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000);
  } else if (input.workspaceId && !input.expiresAt) {
    const retentionDays = Math.max(1, Math.min(3650, Number(process.env.AI_WORKSPACE_HISTORY_DAYS || 90)));
    input.expiresAt = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000);
  }
  return AIInteraction.create({
    userId: input.userId || null,
    workspaceId: input.workspaceId || null,
    feature: input.feature,
    modelVersion: input.modelVersion || null,
    promptVersion: input.promptVersion || null,
    status: input.status || 'completed',
    confidence: input.confidence || null,
    inputSummary: clean(input.inputSummary),
    outputSummary: clean(input.outputSummary),
    metadata: input.metadata || {},
    occurredAt: input.occurredAt || new Date(),
    expiresAt: input.expiresAt || null,
  });
}

async function purgeExpiredAIHistory(now = new Date()) {
  const { AIInteraction } = require('../models');
  return AIInteraction.destroy({ where: { expiresAt: { [Op.lte]: now } } });
}

async function recordAIInteractionSafely(input) {
  try {
    return await recordAIInteraction(input);
  } catch (error) {
    console.error('AI history record error:', error.message);
    return null;
  }
}

module.exports = { purgeExpiredAIHistory, recordAIInteraction, recordAIInteractionSafely };
