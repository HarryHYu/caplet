const businessStudies = require('../data/businessStudiesSubjectPack');
const { parseOutcomesFromText } = require('../services/subjectPackService');

describe('Curriculum Studio subject packs', () => {
  test('extracts coded outcomes from an imported syllabus without duplicating codes', () => {
    const outcomes = parseOutcomesFromText(`
P1 explains the role and structure of a business in society
P2 describes internal and external influences on business decisions
P1 this duplicate line should not create another outcome
Uncoded section heading
    `);

    expect(outcomes).toEqual([
      expect.objectContaining({ code: 'P1', title: expect.stringContaining('role and structure') }),
      expect.objectContaining({ code: 'P2', title: expect.stringContaining('internal and external') }),
    ]);
  });

  test('ships a complete, mapped Business Studies review template', () => {
    expect(businessStudies.outcomes).toHaveLength(20);
    expect(businessStudies.questions).toHaveLength(14);
    expect(businessStudies.reviewItems).toHaveLength(5);
    expect(businessStudies.questions.filter((question) => question.responseType === 'extended_response')).toHaveLength(2);
    const outcomeCodes = new Set(businessStudies.outcomes.map((outcome) => outcome.code));
    expect(businessStudies.questions.every((question) => outcomeCodes.has(question.outcome))).toBe(true);
    expect(businessStudies.reviewItems.every((item) => item.decisionOptions.length >= 2)).toBe(true);
  });
});
