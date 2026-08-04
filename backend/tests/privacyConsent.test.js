const { canUseAI, requireAIConsent } = require('../services/privacyConsent');

describe('AI availability', () => {
  test('allows a signed-in user without age or consent records to use AI', async () => {
    await expect(canUseAI({ id: 'learner-1', dateOfBirth: null })).resolves.toBe(true);
  });

  test('does not ask a minor for guardian approval before AI use', () => {
    const next = jest.fn();

    requireAIConsent(
      { user: { id: 'learner-1', dateOfBirth: '2012-01-01' } },
      {},
      next,
    );

    expect(next).toHaveBeenCalledTimes(1);
  });
});
