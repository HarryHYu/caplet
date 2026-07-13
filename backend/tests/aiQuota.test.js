const {
  consumeAIUnits,
  identityForAIRequest,
  resetAIQuotaForTests,
} = require('../middleware/aiQuota');

describe('shared AI quota', () => {
  beforeEach(() => resetAIQuotaForTests());

  test('shares a weighted budget across features for one user', () => {
    expect(consumeAIUnits('user:learner-1', 12).ok).toBe(true);
    expect(consumeAIUnits('user:learner-1', 12).ok).toBe(true);
    expect(consumeAIUnits('user:learner-1', 16).ok).toBe(true);
    const blocked = consumeAIUnits('user:learner-1', 1);
    expect(blocked).toEqual(expect.objectContaining({ ok: false, reason: 'quota' }));
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(consumeAIUnits('user:learner-2', 1).ok).toBe(true);
  });

  test('derives a stable user or editor-workspace identity', () => {
    expect(identityForAIRequest({ user: { id: 'user-id' }, workspaceId: 'workspace-id' })).toBe('user:user-id');
    expect(identityForAIRequest({ workspaceId: 'workspace-id' })).toBe('workspace:workspace-id');
    expect(identityForAIRequest({ editorWorkspaceId: 'editor-id' })).toBe('workspace:editor-id');
    expect(identityForAIRequest({})).toBeNull();
  });
});
