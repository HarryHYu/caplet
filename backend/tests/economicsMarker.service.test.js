const mockCreate = jest.fn();
jest.mock('openai', () => jest.fn().mockImplementation(() => ({
  chat: { completions: { create: mockCreate } },
})));

const VALID_INPUT = {
  question: 'Explain the effect of a cash rate rise on aggregate demand.',
  markValue: 6,
  responseType: 'short_answer',
  studentAnswer: 'A cash rate rise increases borrowing costs, reducing consumption and investment across the economy.',
  focusArea: 'Monetary policy',
};

function mockAiResponse(obj) {
  mockCreate.mockResolvedValue({ choices: [{ message: { content: JSON.stringify(obj) } }] });
}

describe('markEconomicsAnswer', () => {
  let markEconomicsAnswer;

  beforeEach(() => {
    jest.resetModules();
    mockCreate.mockReset();
    process.env.OPENAI_API_KEY = 'test-key';
    ({ markEconomicsAnswer } = require('../services/economicsMarker'));
  });

  it('throws a 503 when OPENAI_API_KEY is not set', async () => {
    jest.resetModules();
    delete process.env.OPENAI_API_KEY;
    ({ markEconomicsAnswer } = require('../services/economicsMarker'));

    await expect(markEconomicsAnswer(VALID_INPUT)).rejects.toMatchObject({ status: 503 });
  });

  it('rejects a missing question with 400', async () => {
    await expect(markEconomicsAnswer({ ...VALID_INPUT, question: '' })).rejects.toMatchObject({ status: 400 });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('rejects a too-short answer with 400', async () => {
    await expect(markEconomicsAnswer({ ...VALID_INPUT, studentAnswer: 'short' })).rejects.toMatchObject({ status: 400 });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('rejects a non-positive markValue with 400', async () => {
    await expect(markEconomicsAnswer({ ...VALID_INPUT, markValue: 0 })).rejects.toMatchObject({ status: 400 });
  });

  it('clamps an out-of-range estimatedMark into [0, markValue]', async () => {
    mockAiResponse({ estimatedMark: 99, band: 'Band 6', modelAnswer: 'A great model answer.' });
    const result = await markEconomicsAnswer(VALID_INPUT);
    expect(result.estimatedMark).toBe(6);
  });

  it('clamps a negative estimatedMark up to 0', async () => {
    mockAiResponse({ estimatedMark: -5, band: 'Band 1', modelAnswer: 'A model answer.' });
    const result = await markEconomicsAnswer(VALID_INPUT);
    expect(result.estimatedMark).toBe(0);
  });

  it('defaults responseType to short_answer for an unrecognised value', async () => {
    mockAiResponse({ estimatedMark: 3, band: 'Band 3', modelAnswer: 'A model answer.' });
    const result = await markEconomicsAnswer({ ...VALID_INPUT, responseType: 'bogus' });
    expect(result.responseType).toBe('short_answer');
  });

  it('caps strengths/gaps/terminology array lengths and string lengths', async () => {
    mockAiResponse({
      estimatedMark: 4,
      band: 'Band 3',
      modelAnswer: 'A model answer.',
      strengths: Array.from({ length: 10 }, (_, i) => `strength ${i}`),
      gaps: Array.from({ length: 10 }, (_, i) => `gap ${i}`),
      terminology: Array.from({ length: 10 }, (_, i) => `term ${i}`),
    });
    const result = await markEconomicsAnswer(VALID_INPUT);
    expect(result.strengths.length).toBeLessThanOrEqual(4);
    expect(result.gaps.length).toBeLessThanOrEqual(4);
    expect(result.terminology.length).toBeLessThanOrEqual(5);
  });

  it('throws a 502 when the AI returns non-JSON', async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: 'not json' } }] });
    await expect(markEconomicsAnswer(VALID_INPUT)).rejects.toMatchObject({ status: 502 });
  });

  it('throws a 502 when the AI omits a model answer', async () => {
    mockAiResponse({ estimatedMark: 4, band: 'Band 3' });
    await expect(markEconomicsAnswer(VALID_INPUT)).rejects.toMatchObject({ status: 502 });
  });
});
