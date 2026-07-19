/**
 * syllabusProgress.js — per-subject HSC syllabus coverage for one user.
 *
 * Groups the syllabus_points catalogue by module and overlays the user's
 * mastery rows, then rolls each module up to a weighted readiness score and an
 * overall Year-12 "HSC readiness". Ported (leanly) from the old knowledge brain.
 */

const SyllabusPoint = require('../models/SyllabusPoint');
const UserSyllabusProgress = require('../models/UserSyllabusProgress');
const { ensureSyllabusSeeded } = require('./syllabusSeed');

async function getSyllabusProgress(userId, subject = 'Economics') {
  await ensureSyllabusSeeded();

  const allPoints = await SyllabusPoint.findAll({
    where: { subject },
    order: [['module', 'ASC'], ['orderIndex', 'ASC']],
  });
  if (!allPoints.length) return { modules: [], overallHscReadiness: 0, year11Readiness: 0 };

  const pointIds = allPoints.map((p) => p.id);
  const userProgress = await UserSyllabusProgress.findAll({ where: { userId, syllabusPointId: pointIds } });
  const progressByPointId = Object.fromEntries(userProgress.map((up) => [up.syllabusPointId, up]));

  const byModule = {};
  for (const point of allPoints) {
    if (!byModule[point.module]) {
      byModule[point.module] = { module: point.module, moduleName: point.moduleName, year: point.year, points: [] };
    }
    const prog = progressByPointId[point.id];
    byModule[point.module].points.push({
      id: point.id,
      code: point.code,
      topic: point.topic,
      inquiryQuestion: point.inquiryQuestion,
      dotPoint: point.dotPoint,
      weight: point.weight,
      masteryLevel: prog?.masteryLevel ?? 0,
      practiceCount: prog?.practiceCount ?? 0,
      correctCount: prog?.correctCount ?? 0,
      lessonSeen: prog?.lessonSeen ?? false,
      lastPracticed: prog?.lastPracticed ?? null,
    });
  }

  const modules = Object.values(byModule).map((m) => {
    const totalWeight = m.points.reduce((s, p) => s + p.weight, 0);
    const weightedMastery = m.points.reduce((s, p) => s + p.masteryLevel * p.weight, 0);
    const moduleReadiness = totalWeight > 0 ? Math.round(weightedMastery / totalWeight) : 0;
    return {
      ...m,
      moduleReadiness,
      totalPoints: m.points.length,
      masteredCount: m.points.filter((p) => p.masteryLevel >= 80).length,
      practicedCount: m.points.filter((p) => p.practiceCount > 0).length,
    };
  });

  const hscModules = modules.filter((m) => m.year === 12);
  const overallHscReadiness = hscModules.length
    ? Math.round(hscModules.reduce((s, m) => s + m.moduleReadiness, 0) / hscModules.length)
    : 0;
  const y11Modules = modules.filter((m) => m.year === 11);
  const year11Readiness = y11Modules.length
    ? Math.round(y11Modules.reduce((s, m) => s + m.moduleReadiness, 0) / y11Modules.length)
    : 0;

  return { subject, modules, overallHscReadiness, year11Readiness };
}

module.exports = { getSyllabusProgress };
