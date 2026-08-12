/**
 * Unit tests for the essay structure parser. The module is exercised for real
 * (no jest.mock of the service): pure helpers directly, and parseEssay with an
 * injected fake OpenAI client so no network is involved.
 */

// Ensure getClient() cannot construct a real client in this process — the
// no-client path must throw a 503 and every other test injects opts.client.
delete process.env.OPENAI_API_KEY;

const {
  parseEssay,
  sanitizeStructure,
  splitParagraphs,
  firstSentence,
  extractQuotes,
  buildMatcher,
  assembleFromLabels,
  fallbackStructure,
} = require('../services/essayParser');

// Source paragraphs deliberately contain curly quotes/apostrophes so we can
// prove AI strings are snapped back to EXACT source slices.
const INTRO = 'Ambition is the engine of tragedy. Shakespeare argues that ‘vaulting ambition’ destroys Macbeth from within.';
const BODY1 = 'Macbeth’s soliloquy exposes his doubt. He admits he has “no spur to prick the sides of my intent” before the murder.';
const BODY2 = 'Imagery of blood recurs throughout. Blood symbolises guilt that “will have blood” in return.';
const CONCLUSION = 'Ultimately, Macbeth shows that unchecked ambition consumes itself. The tragedy warns every audience.';
const PARAGRAPHS = [INTRO, BODY1, BODY2, CONCLUSION];
const ESSAY = PARAGRAPHS.join('\n\n');
const SOURCE_THESIS = INTRO.slice(INTRO.indexOf('Shakespeare'));

describe('splitParagraphs', () => {
  it('splits on blank lines', () => {
    expect(splitParagraphs('Para one.\n\nPara two.\n\n\nPara three.'))
      .toEqual(['Para one.', 'Para two.', 'Para three.']);
  });

  it('treats whitespace-only lines as blank lines', () => {
    expect(splitParagraphs('Para one.\n   \nPara two.')).toEqual(['Para one.', 'Para two.']);
  });

  it('normalizes \\r\\n line endings before splitting', () => {
    expect(splitParagraphs('Para one.\r\n\r\nPara two.')).toEqual(['Para one.', 'Para two.']);
    // Lone \r also normalizes.
    expect(splitParagraphs('Para one.\r\rPara two.')).toEqual(['Para one.', 'Para two.']);
  });

  it('falls back to single-newline splitting when there are no blank lines', () => {
    expect(splitParagraphs('Line one.\nLine two.\nLine three.'))
      .toEqual(['Line one.', 'Line two.', 'Line three.']);
  });

  it('keeps single newlines inside a paragraph when blank-line breaks exist', () => {
    expect(splitParagraphs('Para one.\n\nPara two,\nstill two.'))
      .toEqual(['Para one.', 'Para two,\nstill two.']);
  });

  it('returns [] for empty, whitespace-only, and nullish input', () => {
    expect(splitParagraphs('')).toEqual([]);
    expect(splitParagraphs('   \n \n  ')).toEqual([]);
    expect(splitParagraphs(null)).toEqual([]);
    expect(splitParagraphs(undefined)).toEqual([]);
  });

  it('returns a single paragraph unchanged when there are no newlines', () => {
    expect(splitParagraphs('One paragraph only.')).toEqual(['One paragraph only.']);
  });
});

describe('firstSentence', () => {
  it('returns only the first sentence of a multi-sentence paragraph', () => {
    expect(firstSentence('First sentence here. Second sentence there. Third one.'))
      .toBe('First sentence here.');
    expect(firstSentence('Is it a question? Yes.')).toBe('Is it a question?');
  });

  it('returns the whole paragraph when it has no terminal punctuation', () => {
    expect(firstSentence('an unfinished thought without any terminal punctuation'))
      .toBe('an unfinished thought without any terminal punctuation');
  });

  it('breaks at a sentence that ends with a closing quote mark', () => {
    // The terminator sits inside the quotes; the sentence must not swallow
    // "Next sentence." (the closing mark is consumed by the lookahead, so the
    // returned verbatim prefix ends at the full stop).
    expect(firstSentence('He said "stop." Next sentence.')).toBe('He said "stop.');
    expect(firstSentence('He said “stop.” Next sentence.')).toBe('He said “stop.');
  });

  it('does not break on a full stop that is not followed by whitespace', () => {
    expect(firstSentence('See section 3.2 for detail. Then stop.'))
      .toBe('See section 3.2 for detail.');
  });
});

describe('extractQuotes', () => {
  it('extracts double straight-quoted spans including the marks', () => {
    expect(extractQuotes('He wrote "power tends to corrupt" in a letter.'))
      .toEqual(['"power tends to corrupt"']);
  });

  it('extracts curly-quoted spans including the marks', () => {
    expect(extractQuotes('He admits “no spur to prick the sides” early on.'))
      .toEqual(['“no spur to prick the sides”']);
  });

  it('applies minimum lengths (12 for double quotes, 20 for single quotes)', () => {
    expect(extractQuotes('A "short" aside.')).toEqual([]); // 5 < 12
    expect(extractQuotes("A 'short single' aside.")).toEqual([]); // 12 < 20
    expect(extractQuotes("He said 'this single quote has enough length' here."))
      .toEqual(["'this single quote has enough length'"]);
  });

  it('caps extraction at 20 quotes', () => {
    const paragraph = Array.from({ length: 25 }, (_, i) => `"quote number ${String(i).padStart(2, '0')}"`).join(' and ');
    const quotes = extractQuotes(paragraph);
    expect(quotes).toHaveLength(20);
    expect(quotes[0]).toBe('"quote number 00"');
    expect(quotes[19]).toBe('"quote number 19"');
  });

  it('returns [] for empty or nullish input', () => {
    expect(extractQuotes('')).toEqual([]);
    expect(extractQuotes(null)).toEqual([]);
  });
});

describe('buildMatcher', () => {
  it('finds a needle despite curly-vs-straight apostrophe differences and returns the exact source slice', () => {
    const source = 'It’s Macbeth’s downfall that defines him.';
    const found = buildMatcher(source).find("It's Macbeth's downfall");
    expect(found).toBe('It’s Macbeth’s downfall');
    expect(source.indexOf(found)).toBe(0);
  });

  it('finds a needle across collapsed whitespace and preserves the original newline', () => {
    const source = 'power tends to\ncorrupt   absolutely in the end';
    const found = buildMatcher(source).find('tends to corrupt absolutely');
    expect(found).toBe('tends to\ncorrupt   absolutely');
    expect(source.indexOf(found)).toBeGreaterThanOrEqual(0);
  });

  it('matches case-insensitively but returns the source casing', () => {
    const source = 'Power Tends To Corrupt.';
    expect(buildMatcher(source).find('power tends to corrupt')).toBe('Power Tends To Corrupt');
  });

  it('snaps straight double quotes to the source curly quotes verbatim', () => {
    const source = 'He cites “the raven himself is hoarse” early on.';
    const found = buildMatcher(source).find('"the raven himself is hoarse"');
    expect(found).toBe('“the raven himself is hoarse”');
    // The returned string is an exact substring of the source...
    expect(source.indexOf(found)).toBeGreaterThanOrEqual(0);
    // ...and keeps the source's smart quotes rather than the needle's.
    expect(found).toContain('“');
    expect(found).toContain('”');
    expect(found).not.toContain('"');
  });

  it('returns null for absent needles', () => {
    expect(buildMatcher('some source text').find('completely missing words')).toBeNull();
  });

  it('returns null for needles under 3 normalized characters', () => {
    const matcher = buildMatcher('abcdef');
    expect(matcher.find('ab')).toBeNull(); // present but too short
    expect(matcher.find('  a ')).toBeNull(); // normalizes to 1 char
    expect(matcher.find('')).toBeNull();
    expect(matcher.find(null)).toBeNull();
    expect(matcher.find('abc')).toBe('abc'); // 3 chars is enough
  });
});

describe('assembleFromLabels', () => {
  it('(a) assembles full labels with verbatim source paragraphs and a snapped thesis', () => {
    const labels = {
      introIndex: 0,
      conclusionIndex: 3,
      // Smart-quote-mangled by the AI: straight quotes instead of the source's curly ones.
      thesis: "Shakespeare argues that 'vaulting ambition' destroys Macbeth from within.",
      bodyParagraphs: [
        {
          index: 1,
          topicSentence: "Macbeth's soliloquy exposes his doubt.",
          quotes: [{ text: '"no spur to prick the sides of my intent"', highLeverage: true }],
          techniques: ['soliloquy'],
        },
        {
          index: 2,
          topicSentence: 'Imagery of blood recurs throughout.',
          quotes: [{ text: '"will have blood"', highLeverage: false }],
          techniques: [],
        },
      ],
    };

    const structure = assembleFromLabels(labels, PARAGRAPHS);

    expect(structure.introduction).toBe(INTRO);
    expect(structure.conclusion).toBe(CONCLUSION);
    // Thesis snapped back to the exact source slice, curly quotes intact.
    expect(structure.thesis).toBe(SOURCE_THESIS);
    expect(structure.thesis).toContain('‘vaulting ambition’');
    expect(INTRO.indexOf(structure.thesis)).toBeGreaterThanOrEqual(0);

    expect(structure.bodyParagraphs).toHaveLength(2);
    // Paragraph text is the source, character for character.
    expect(structure.bodyParagraphs[0].text).toBe(BODY1);
    expect(structure.bodyParagraphs[1].text).toBe(BODY2);
    // Topic sentence snapped to the source's curly apostrophe.
    expect(structure.bodyParagraphs[0].topicSentence).toBe('Macbeth’s soliloquy exposes his doubt.');
    // Quotes snapped to the source's curly marks; highLeverage preserved.
    expect(structure.bodyParagraphs[0].quotes).toEqual([
      { text: '“no spur to prick the sides of my intent”', highLeverage: true },
    ]);
    expect(structure.bodyParagraphs[1].quotes).toEqual([
      { text: '“will have blood”', highLeverage: false },
    ]);
    expect(structure.bodyParagraphs[0].techniques).toEqual(['soliloquy']);
  });

  it('(b) handles body-only labels: no introduction/conclusion, every paragraph is body', () => {
    const structure = assembleFromLabels(
      { introIndex: null, conclusionIndex: null, thesis: '', bodyParagraphs: [] },
      PARAGRAPHS,
    );
    expect(structure.introduction).toBe('');
    expect(structure.conclusion).toBe('');
    expect(structure.thesis).toBe('');
    expect(structure.bodyParagraphs.map((p) => p.text)).toEqual(PARAGRAPHS);
  });

  it('(c) keeps paragraphs the AI omitted, with a deterministic first-sentence topic', () => {
    const labels = {
      introIndex: 0,
      conclusionIndex: 3,
      bodyParagraphs: [{ index: 1, topicSentence: 'Macbeth’s soliloquy exposes his doubt.' }],
      // index 2 omitted by the AI
    };
    const structure = assembleFromLabels(labels, PARAGRAPHS);
    expect(structure.bodyParagraphs).toHaveLength(2);
    expect(structure.bodyParagraphs[1].text).toBe(BODY2);
    expect(structure.bodyParagraphs[1].topicSentence).toBe(firstSentence(BODY2));
    expect(structure.bodyParagraphs[1].topicSentence).toBe('Imagery of blood recurs throughout.');
  });

  it('(d) falls back to the real first sentence when the AI topic sentence is a paraphrase', () => {
    const labels = {
      introIndex: null,
      conclusionIndex: null,
      bodyParagraphs: [
        { index: 0, topicSentence: 'The playwright believes ambition is destructive.' }, // not in source
      ],
    };
    const structure = assembleFromLabels(labels, [INTRO]);
    expect(structure.bodyParagraphs[0].topicSentence).toBe('Ambition is the engine of tragedy.');
  });

  it('(e) drops unfindable AI quotes and fills in regex-extracted quotes instead', () => {
    const labels = {
      introIndex: null,
      conclusionIndex: null,
      bodyParagraphs: [
        {
          index: 0,
          quotes: [{ text: 'this quote appears nowhere in the paragraph', highLeverage: true }],
        },
      ],
    };
    const structure = assembleFromLabels(labels, [BODY1]);
    expect(structure.bodyParagraphs[0].quotes).toEqual([
      { text: '“no spur to prick the sides of my intent”', highLeverage: false },
    ]);
  });

  it('(e2) does not add regex quotes when at least one AI quote was findable', () => {
    const labels = {
      introIndex: null,
      conclusionIndex: null,
      bodyParagraphs: [
        {
          index: 1,
          quotes: [
            { text: 'nowhere to be found in this paragraph', highLeverage: true },
            { text: '"will have blood"', highLeverage: true },
          ],
        },
      ],
    };
    const structure = assembleFromLabels(labels, [BODY1, BODY2]);
    expect(structure.bodyParagraphs[1].quotes).toEqual([
      { text: '“will have blood”', highLeverage: true },
    ]);
  });

  it('(f) preserves at least one body paragraph when intro+conclusion claim all paragraphs', () => {
    const two = ['Opening paragraph of a tiny essay.', 'Closing paragraph of a tiny essay.'];
    const structure = assembleFromLabels(
      { introIndex: 0, conclusionIndex: 1, bodyParagraphs: [] },
      two,
    );
    expect(structure.introduction).toBe(two[0]);
    expect(structure.conclusion).toBe('');
    expect(structure.bodyParagraphs).toHaveLength(1);
    expect(structure.bodyParagraphs[0].text).toBe(two[1]);
  });

  it('(f2) a single-paragraph essay stays a body paragraph even when labelled intro', () => {
    const one = ['The only paragraph there is.'];
    const structure = assembleFromLabels({ introIndex: 0, conclusionIndex: 0 }, one);
    expect(structure.introduction).toBe('');
    expect(structure.conclusion).toBe('');
    expect(structure.bodyParagraphs).toHaveLength(1);
    expect(structure.bodyParagraphs[0].text).toBe(one[0]);
  });

  it('(g) ignores out-of-range, non-integer, duplicate, and claimed body indices', () => {
    const paragraphs = [
      'Alpha sentence one. Alpha sentence two.',
      'Beta sentence one. Beta sentence two.',
    ];
    const labels = {
      introIndex: 7, // out of range -> no introduction
      conclusionIndex: -1, // out of range -> no conclusion
      bodyParagraphs: [
        { index: 5, topicSentence: 'Beta sentence two.' }, // out of range -> ignored
        { index: '0', topicSentence: 'Alpha sentence two.' }, // non-integer -> ignored
        { index: 0, topicSentence: 'Alpha sentence two.' }, // first valid entry for 0 wins
        { index: 0, topicSentence: 'Alpha sentence one.' }, // duplicate -> ignored
      ],
    };
    const structure = assembleFromLabels(labels, paragraphs);
    expect(structure.introduction).toBe('');
    expect(structure.conclusion).toBe('');
    expect(structure.bodyParagraphs).toHaveLength(2);
    expect(structure.bodyParagraphs[0].topicSentence).toBe('Alpha sentence two.');
    // Paragraph 1 got no valid label -> deterministic first sentence.
    expect(structure.bodyParagraphs[1].topicSentence).toBe('Beta sentence one.');
  });

  it('(g2) skips body entries whose index is claimed by the introduction', () => {
    const labels = {
      introIndex: 0,
      conclusionIndex: null,
      bodyParagraphs: [
        { index: 0, topicSentence: 'Ambition is the engine of tragedy.' }, // claimed -> ignored
        { index: 1, topicSentence: 'Macbeth’s soliloquy exposes his doubt.' },
      ],
    };
    const structure = assembleFromLabels(labels, [INTRO, BODY1]);
    expect(structure.introduction).toBe(INTRO);
    expect(structure.bodyParagraphs).toHaveLength(1);
    expect(structure.bodyParagraphs[0].text).toBe(BODY1);
  });

  it('drops conclusionIndex when it duplicates introIndex', () => {
    const structure = assembleFromLabels({ introIndex: 0, conclusionIndex: 0 }, PARAGRAPHS);
    expect(structure.introduction).toBe(INTRO);
    expect(structure.conclusion).toBe('');
    expect(structure.bodyParagraphs.map((p) => p.text)).toEqual([BODY1, BODY2, CONCLUSION]);
  });

  it('locates the thesis anywhere in the essay when there is no introduction', () => {
    const structure = assembleFromLabels(
      { introIndex: null, conclusionIndex: null, thesis: '"will have blood" in return', bodyParagraphs: [] },
      PARAGRAPHS,
    );
    expect(structure.thesis).toBe('“will have blood” in return');
  });
});

describe('fallbackStructure', () => {
  it('labels every paragraph as body with deterministic topic sentences and regex quotes', () => {
    const structure = fallbackStructure(PARAGRAPHS);
    expect(structure.thesis).toBe('');
    expect(structure.introduction).toBe('');
    expect(structure.conclusion).toBe('');
    expect(structure.bodyParagraphs).toHaveLength(4);
    structure.bodyParagraphs.forEach((p, i) => {
      expect(p.text).toBe(PARAGRAPHS[i]);
      expect(p.topicSentence).toBe(firstSentence(PARAGRAPHS[i]));
      expect(p.techniques).toEqual([]);
    });
    expect(structure.bodyParagraphs[1].quotes).toEqual([
      { text: '“no spur to prick the sides of my intent”', highLeverage: false },
    ]);
    expect(structure.bodyParagraphs[3].quotes).toEqual([]);
  });
});

describe('sanitizeStructure', () => {
  it('defaults every field for non-object input', () => {
    const empty = { thesis: '', introduction: '', bodyParagraphs: [], conclusion: '' };
    expect(sanitizeStructure(null)).toEqual(empty);
    expect(sanitizeStructure(undefined)).toEqual(empty);
    expect(sanitizeStructure('nope')).toEqual(empty);
  });

  it('defaults and clamps the introduction field', () => {
    expect(sanitizeStructure({ bodyParagraphs: [] }).introduction).toBe('');
    const long = 'x'.repeat(7000);
    const out = sanitizeStructure({ introduction: long, conclusion: long, thesis: 'y'.repeat(3000) });
    expect(out.introduction).toHaveLength(6000);
    expect(out.conclusion).toHaveLength(6000);
    expect(out.thesis).toHaveLength(2000);
  });

  it('caps body paragraphs at 30 and quotes/techniques at 20 each', () => {
    const out = sanitizeStructure({
      bodyParagraphs: Array.from({ length: 35 }, (_, i) => ({
        topicSentence: `topic ${i}`,
        text: `text ${i}`,
        quotes: Array.from({ length: 25 }, (_, q) => ({ text: `quote ${q}`, highLeverage: q === 0 })),
        techniques: Array.from({ length: 25 }, (_, t) => `technique ${t}`),
      })),
    });
    expect(out.bodyParagraphs).toHaveLength(30);
    expect(out.bodyParagraphs[0].quotes).toHaveLength(20);
    expect(out.bodyParagraphs[0].techniques).toHaveLength(20);
    expect(out.bodyParagraphs[0].quotes[0]).toEqual({ text: 'quote 0', highLeverage: true });
    expect(out.bodyParagraphs[0].quotes[1].highLeverage).toBe(false);
  });

  it('clamps long strings and coerces quote shapes', () => {
    const out = sanitizeStructure({
      bodyParagraphs: [{
        topicSentence: 't'.repeat(1500),
        text: 'x'.repeat(7000),
        quotes: ['a plain string quote', { text: 'q'.repeat(1500) }, { text: '   ' }, 42],
        techniques: ['m'.repeat(100), '   ', 'metaphor'],
      }],
    });
    const para = out.bodyParagraphs[0];
    expect(para.topicSentence).toHaveLength(1000);
    expect(para.text).toHaveLength(6000);
    expect(para.quotes[0]).toEqual({ text: 'a plain string quote', highLeverage: false });
    expect(para.quotes[1].text).toHaveLength(1000);
    // Blank quote dropped; a bare non-object quote is coerced to {text: String(q)}.
    expect(para.quotes.map((q) => q.text)).toEqual(['a plain string quote', 'q'.repeat(1000), '42']);
    expect(para.techniques).toEqual(['m'.repeat(80), 'metaphor']);
  });

  it('drops body paragraphs with neither text nor topic sentence', () => {
    const out = sanitizeStructure({
      bodyParagraphs: [
        { topicSentence: '  ', text: '   ' },
        { topicSentence: 'kept', text: '' },
      ],
    });
    expect(out.bodyParagraphs).toHaveLength(1);
    expect(out.bodyParagraphs[0].topicSentence).toBe('kept');
  });
});

describe('parseEssay (fake OpenAI client)', () => {
  const makeFakeClient = (result) => {
    const create = typeof result === 'function' ? jest.fn(result) : jest.fn().mockResolvedValue(result);
    return { client: { chat: { completions: { create } } }, create };
  };
  const completionWith = (labels, finishReason = 'stop') => ({
    choices: [{ finish_reason: finishReason, message: { content: JSON.stringify(labels) } }],
  });
  const HAPPY_LABELS = {
    introIndex: 0,
    conclusionIndex: 3,
    thesis: "Shakespeare argues that 'vaulting ambition' destroys Macbeth from within.",
    bodyParagraphs: [
      { index: 1, topicSentence: "Macbeth's soliloquy exposes his doubt.", quotes: [{ text: '"no spur to prick the sides of my intent"', highLeverage: true }], techniques: ['soliloquy'] },
      { index: 2, topicSentence: 'Imagery of blood recurs throughout.', quotes: [{ text: '"will have blood"', highLeverage: false }], techniques: [] },
    ],
  };

  it('(a) happy path: returns the assembled structure and sends model/max tokens/temperature 0', async () => {
    const { client, create } = makeFakeClient(completionWith(HAPPY_LABELS));

    const structure = await parseEssay(ESSAY, { client, model: 'gpt-5.5' });

    expect(structure.introduction).toBe(INTRO);
    expect(structure.conclusion).toBe(CONCLUSION);
    expect(structure.thesis).toBe(SOURCE_THESIS);
    expect(structure.bodyParagraphs.map((p) => p.text)).toEqual([BODY1, BODY2]);

    expect(create).toHaveBeenCalledTimes(1);
    const args = create.mock.calls[0][0];
    expect(args.model).toBe('gpt-5.5');
    expect(args.max_completion_tokens).toBe(8000);
    expect(args.temperature).toBe(0);
    expect(args.response_format).toEqual({ type: 'json_object' });

    const userMessage = args.messages.find((m) => m.role === 'user');
    // The essay is sent as numbered paragraphs, not as the raw text.
    expect(userMessage.content).toContain(`[P0]\n${INTRO}`);
    expect(userMessage.content).toContain(`[P1]\n${BODY1}`);
    expect(userMessage.content).toContain(`[P3]\n${CONCLUSION}`);
    expect(userMessage.content).not.toContain(`${INTRO}\n\n${BODY1}`);
  });

  it('(a2) defaults the model to gpt-5.4-mini when none is given', async () => {
    const { client, create } = makeFakeClient(completionWith(HAPPY_LABELS));
    await parseEssay(ESSAY, { client });
    expect(create.mock.calls[0][0].model).toBe('gpt-5.4-mini');
  });

  it("(b) returns the deterministic fallback when finish_reason is 'length'", async () => {
    const { client } = makeFakeClient(completionWith(HAPPY_LABELS, 'length'));
    const structure = await parseEssay(ESSAY, { client });
    expect(structure).toEqual(fallbackStructure(PARAGRAPHS));
    expect(structure.bodyParagraphs).toHaveLength(4);
    expect(structure.introduction).toBe('');
  });

  it('(c) returns the fallback when the AI returns non-JSON', async () => {
    const { client } = makeFakeClient({
      choices: [{ finish_reason: 'stop', message: { content: 'this is not JSON at all {' } }],
    });
    const structure = await parseEssay(ESSAY, { client });
    expect(structure).toEqual(fallbackStructure(PARAGRAPHS));
  });

  it('(d) returns the fallback when the client throws', async () => {
    const { client } = makeFakeClient(() => Promise.reject(new Error('upstream exploded')));
    const structure = await parseEssay(ESSAY, { client });
    expect(structure).toEqual(fallbackStructure(PARAGRAPHS));
  });

  it('(e) throws a 503 when no client is injected and OPENAI_API_KEY is unset', async () => {
    expect(process.env.OPENAI_API_KEY).toBeUndefined();
    await expect(parseEssay(ESSAY)).rejects.toMatchObject({
      status: 503,
      message: expect.stringMatching(/not configured/i),
    });
  });

  it('(f) throws a 400 for empty or whitespace-only text', async () => {
    const { client, create } = makeFakeClient(completionWith(HAPPY_LABELS));
    await expect(parseEssay('', { client })).rejects.toMatchObject({ status: 400 });
    await expect(parseEssay('   \n \n ', { client })).rejects.toMatchObject({ status: 400 });
    await expect(parseEssay(null, { client })).rejects.toMatchObject({ status: 400 });
    expect(create).not.toHaveBeenCalled();
  });

  it("(g) omits temperature for reasoning models like 'o3'", async () => {
    const { client, create } = makeFakeClient(completionWith(HAPPY_LABELS));
    await parseEssay(ESSAY, { client, model: 'o3' });
    const args = create.mock.calls[0][0];
    expect(args.model).toBe('o3');
    expect(Object.prototype.hasOwnProperty.call(args, 'temperature')).toBe(false);
    expect(args.max_completion_tokens).toBe(8000);
  });
});
