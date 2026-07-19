const businessStudies = require('../data/businessStudiesSubjectPack');
const { buildReadinessSummary, parseOutcomesFromText } = require('../services/subjectPackService');

describe('Curriculum Studio subject packs', () => {
  test('extracts coded outcomes from an imported syllabus without duplicating codes', () => {
    const outcomes = parseOutcomesFromText(`
[Page 12]
P1 explains the role and structure of a business in society
P2 describes internal and external influences on business decisions
P1 this duplicate line should not create another outcome
Uncoded section heading
    `);

    expect(outcomes).toEqual([
      expect.objectContaining({ code: 'P1', title: expect.stringContaining('role and structure'), sourcePage: 12 }),
      expect.objectContaining({ code: 'P2', title: expect.stringContaining('internal and external'), sourcePage: 12 }),
    ]);
  });

  test('ships a complete, mapped Business Studies review template', () => {
    expect(businessStudies.outcomes).toHaveLength(20);
    expect(businessStudies.questions).toHaveLength(23);
    expect(businessStudies.reviewItems).toHaveLength(5);
    expect(businessStudies.questions.filter((question) => question.responseType === 'extended_response')).toHaveLength(2);
    const outcomeCodes = new Set(businessStudies.outcomes.map((outcome) => outcome.code));
    expect(businessStudies.questions.every((question) => outcomeCodes.has(question.outcome))).toBe(true);
    expect(businessStudies.reviewItems.every((item) => item.decisionOptions.length >= 2)).toBe(true);
    expect(new Set(businessStudies.questions.map((question) => question.outcome)).size).toBe(20);
  });

  test('requires quality-checked coverage across a generic second subject', () => {
    const outcomes = ['LS11-1', 'LS11-2', 'LS11-3', 'LS11-4', 'LS11-5'].map((code, index) => ({
      id: `legal-outcome-${index + 1}`,
      code,
      title: `Legal Studies outcome ${index + 1}`,
      isAssessable: true,
      isActive: true,
    }));
    const questions = outcomes.map((outcome, index) => ({
      id: `legal-question-${index + 1}`,
      prompt: `Which legal principle best explains scenario ${index + 1}?`,
      responseType: 'multiple_choice',
      options: ['Principle A', 'Principle B'],
      answerKey: { index: 0, value: 'Principle A' },
      explanation: 'The facts engage Principle A.',
      difficulty: 'standard',
      marks: 1,
      expectedMinutes: 2,
      syllabusVersion: 'NSW-2025',
      source: { url: 'https://curriculum.nsw.edu.au/legal-studies' },
      lifecycleStatus: 'approved',
      reviewedAt: new Date(),
    }));
    const mappings = outcomes.map((outcome, index) => ({ questionId: `legal-question-${index + 1}`, outcomeId: outcome.id }));
    const ready = buildReadinessSummary({
      outcomes,
      questions,
      mappings,
      reviewItems: [],
      sourceDocuments: [{ id: 'legal-source', name: 'Legal Studies syllabus', verified: true }],
    });

    expect(ready.canPublish).toBe(true);
    expect(ready.coverage).toMatchObject({ ready: 5, total: 5, gaps: [] });
    expect(ready.diagnostic).toMatchObject({ ready: 5, total: 5 });

    const incomplete = buildReadinessSummary({
      outcomes,
      questions: questions.slice(0, 4),
      mappings: mappings.slice(0, 4),
      reviewItems: [],
      sourceDocuments: [{ id: 'legal-source', name: 'Legal Studies syllabus', verified: true }],
    });
    expect(incomplete.canPublish).toBe(false);
    expect(incomplete.coverage.gaps).toEqual([expect.objectContaining({ code: 'LS11-5' })]);
    expect(incomplete.blockers).toEqual(expect.arrayContaining([
      expect.stringMatching(/uncovered outcome/),
      expect.stringMatching(/multiple-choice/),
    ]));
  });
});
