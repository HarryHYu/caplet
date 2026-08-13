const { supportsTemperature, samplingParams } = require('../utils/modelParams');

describe('supportsTemperature', () => {
  it('rejects the whole gpt-5 family, including dotted ids', () => {
    // The production 400 came from these being treated as temperature-capable.
    ['gpt-5', 'gpt-5.4', 'gpt-5.4-mini', 'gpt-5.4-nano', 'gpt-5.5', 'GPT-5.4-MINI']
      .forEach((m) => expect(supportsTemperature(m)).toBe(false));
  });

  it('rejects o-series reasoning models', () => {
    ['o1', 'o3', 'o3-mini', 'o4-preview'].forEach((m) => expect(supportsTemperature(m)).toBe(false));
  });

  it('allows known legacy families only', () => {
    ['gpt-4o', 'gpt-4.1', 'gpt-4-turbo', 'gpt-3.5-turbo']
      .forEach((m) => expect(supportsTemperature(m)).toBe(true));
  });

  it('rejects empty, nullish and unknown ids (omitting is always safe)', () => {
    ['', '   ', null, undefined, 'llama-3', 'some-future-model']
      .forEach((m) => expect(supportsTemperature(m)).toBe(false));
  });
});

describe('samplingParams', () => {
  it('omits temperature for models that refuse it', () => {
    expect(samplingParams('gpt-5.4-mini', 0.4)).toEqual({});
    expect(samplingParams('o3', 0)).toEqual({});
  });

  it('sends temperature for models that accept it', () => {
    expect(samplingParams('gpt-4o', 0.4)).toEqual({ temperature: 0.4 });
    expect(samplingParams('gpt-4o', 0)).toEqual({ temperature: 0 });
  });

  it('omits a non-numeric temperature', () => {
    expect(samplingParams('gpt-4o', undefined)).toEqual({});
    expect(samplingParams('gpt-4o', '0.4')).toEqual({});
  });
});
