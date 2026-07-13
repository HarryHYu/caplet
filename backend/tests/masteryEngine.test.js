const { calculateMastery } = require('../services/masteryEngine');

const NOW = new Date('2026-07-13T00:00:00.000Z');
const evidence = (daysAgo, normalizedScore, extras = {}) => ({
  score: normalizedScore * 10,
  maxScore: 10,
  normalizedScore,
  occurredAt: new Date(NOW.getTime() - daysAgo * 24 * 60 * 60 * 1000),
  markingMethod: 'deterministic',
  assessmentType: 'daily',
  difficulty: 'core',
  misconceptionCodes: [],
  metadata: {},
  ...extras,
});

describe('calculateMastery', () => {
  test('returns an explainable low-confidence prior without evidence', () => {
    expect(calculateMastery([], NOW)).toEqual(expect.objectContaining({
      probability: 0.2,
      evidenceCount: 0,
      confidence: 'low',
      mastered: false,
    }));
  });

  test('requires separate days and transfer evidence before mastery', () => {
    const sameDay = calculateMastery([
      evidence(1, 1), evidence(1, 1), evidence(1, 1, { metadata: { transfer: true } }),
    ], NOW);
    expect(sameDay.mastered).toBe(false);
    expect(sameDay.distinctDays).toBe(1);
  });

  test('recognises durable high-quality evidence and schedules later review', () => {
    const result = calculateMastery([
      evidence(7, 1),
      evidence(5, 1),
      evidence(3, 1),
      evidence(1, 1, { assessmentType: 'exam', difficulty: 'transfer', metadata: { transfer: true } }),
      evidence(0, 1),
      evidence(0, 1),
      evidence(0, 1),
      evidence(0, 1),
    ], NOW);
    expect(result.probability).toBeGreaterThanOrEqual(0.8);
    expect(result.mastered).toBe(true);
    expect(result.confidence).toBe('high');
    expect(result.nextReviewAt.getTime()).toBeGreaterThan(NOW.getTime());
  });

  test('surfaces recurring misconceptions by frequency', () => {
    const result = calculateMastery([
      evidence(3, 0.2, { misconceptionCodes: ['demand-shift', 'elasticity'] }),
      evidence(1, 0.3, { misconceptionCodes: ['demand-shift'] }),
    ], NOW);
    expect(result.misconceptions[0]).toEqual({ code: 'demand-shift', count: 2 });
  });

  test('never treats heuristic writing feedback as verified mastery or transfer proof', () => {
    const result = calculateMastery([
      evidence(4, 1, { markingMethod: 'heuristic' }),
      evidence(3, 1, { markingMethod: 'heuristic' }),
      evidence(2, 1, { markingMethod: 'heuristic', difficulty: 'transfer', metadata: { transfer: true } }),
      evidence(1, 1, { markingMethod: 'heuristic' }),
      evidence(0, 1, { markingMethod: 'heuristic' }),
    ], NOW);
    expect(result.mastered).toBe(false);
    expect(result.confidence).toBe('low');
    expect(result.verifiedEvidenceCount).toBe(0);
    expect(result.verifiedDistinctDays).toBe(0);
  });
});
