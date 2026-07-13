const { validateLessonContent } = require('../services/contentValidation');

const valid = {
  title: 'Market equilibrium',
  syllabusVersion: 'NSW-2025',
  lifecycleStatus: 'in_review',
  outcomeIds: ['outcome-1'],
  sourceInfo: { sourceUrl: 'https://curriculum.nsw.edu.au/example', reviewedAt: new Date().toISOString() },
  slides: [
    { type: 'text', content: 'Markets move toward equilibrium through price signals.' },
    { type: 'choice', question: 'What creates a surplus?', options: ['A low price', 'A high price'], correctIndices: [1], mode: 'single', explanation: 'A price above equilibrium creates excess supply.' },
  ],
};

describe('lesson publishing validation', () => {
  test('accepts mapped, sourced, valid lesson content', () => {
    expect(validateLessonContent(valid)).toEqual(expect.objectContaining({ ok: true, errors: [] }));
  });

  test('blocks empty and unmapped content', () => {
    const result = validateLessonContent({ title: '', slides: [], outcomeIds: [] });
    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.code)).toEqual(expect.arrayContaining(['missing_title', 'missing_content', 'missing_outcomes']));
  });

  test('detects repeated assessment prompts', () => {
    const slide = valid.slides[1];
    const result = validateLessonContent({ ...valid, slides: [slide, { ...slide }] });
    expect(result.errors).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'duplicate_question' })]));
  });

  test('blocks unsupported embeds and warns about inaccessible media', () => {
    const result = validateLessonContent({
      ...valid,
      slides: [
        { type: 'embed', url: 'https://untrusted.example/video', title: 'A video', aspect: '16:9' },
        { type: 'media', source: 'image', url: 'https://example.com/chart.png', aspect: 'auto' },
      ],
    });
    expect(result.errors).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'unsupported_embed' })]));
    expect(result.warnings).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'missing_image_description' })]));
  });
});
