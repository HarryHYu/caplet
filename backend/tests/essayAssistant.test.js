/**
 * Unit tests for the essay workspace assistant. The module is exercised for
 * real (no jest.mock of the service): assistEssay/explainEssay with an
 * injected fake OpenAI client so no network is involved, plus the pure
 * context-budget helper directly.
 */

// Ensure getClient() cannot construct a real client in this process — the
// no-client path must throw a 503 and every other test injects opts.client.
delete process.env.OPENAI_API_KEY;

const {
  assistEssay,
  explainEssay,
  fitContextDocs,
} = require('../services/essayAssistant');

// Body paragraphs deliberately contain curly quotes/apostrophes so we can
// prove AI anchors are snapped back to EXACT source slices.
const BODY1 = 'Macbeth’s soliloquy exposes his doubt. He admits he has “no spur to prick the sides of my intent” before the murder.';
const BODY2 = 'Imagery of blood recurs throughout. Blood symbolises guilt that “will have blood” in return.';

const makeEssay = (overrides = {}) => ({
  id: 'e1',
  title: 'Macbeth and ambition',
  originalText: `${BODY1}\n\n${BODY2}`,
  parsedStructure: {
    thesis: '',
    introduction: '',
    bodyParagraphs: [
      { topicSentence: 'Macbeth’s soliloquy exposes his doubt.', text: BODY1, quotes: [], techniques: [] },
      { topicSentence: 'Imagery of blood recurs throughout.', text: BODY2, quotes: [], techniques: [] },
    ],
    conclusion: '',
  },
  ...overrides,
});

const makeClient = (payload, finishReason = 'stop') => {
  const create = jest.fn().mockResolvedValue({
    choices: [{
      finish_reason: finishReason,
      message: { content: typeof payload === 'string' ? payload : JSON.stringify(payload) },
    }],
  });
  return { client: { chat: { completions: { create } } }, create };
};

const USER_TURN = [{ role: 'user', content: 'What does the blood imagery mean?' }];

describe('assistEssay', () => {
  it('throws a 503 when no client is available (no OPENAI_API_KEY)', async () => {
    await expect(assistEssay({ essay: makeEssay(), messages: USER_TURN }))
      .rejects.toMatchObject({ status: 503, message: expect.stringMatching(/not configured/i) });
  });

  it('throws a 400 when there are no messages', async () => {
    const { client } = makeClient({ reply: 'x', annotations: [] });
    await expect(assistEssay({ essay: makeEssay(), messages: [], client }))
      .rejects.toMatchObject({ status: 400 });
  });

  it('grounds the system prompt in the essay, paragraph map, annotations and context library, and forwards the history', async () => {
    const { client, create } = makeClient({ reply: 'Grounded answer.', annotations: [] });
    const messages = [
      { role: 'user', content: 'Summarise my sources.' },
      { role: 'assistant', content: 'Which paragraph?' },
      { role: 'user', content: 'The blood one.' },
    ];

    const result = await assistEssay({
      essay: makeEssay(),
      contextDocs: [
        { title: 'Holinshed chronicle notes', content: 'The real Macbeth reigned for seventeen years.' },
        { title: 'Class handout', content: 'Blood imagery tracks guilt through the play.' },
      ],
      annotations: [
        { paragraphIndex: 1, kind: 'note', source: 'user', note: 'Link this to the dagger scene.' },
      ],
      messages,
      client,
    });

    expect(result.reply).toBe('Grounded answer.');
    expect(result.annotations).toEqual([]);
    expect(create).toHaveBeenCalledTimes(1);

    const args = create.mock.calls[0][0];
    expect(args.model).toBe('gpt-5.4-mini');
    expect(args.response_format).toEqual({ type: 'json_object' });
    expect(args.max_completion_tokens).toBe(2500);
    // gpt-5 family rejects a custom temperature — it must not be sent.
    expect(args.temperature).toBeUndefined();

    const system = args.messages[0];
    expect(system.role).toBe('system');
    expect(system.content).toContain('Macbeth and ambition'); // essay title
    expect(system.content).toContain(BODY1); // verbatim essay text
    expect(system.content).toContain(BODY2);
    expect(system.content).toContain('¶1:'); // paragraph map
    expect(system.content).toContain('¶2: Imagery of blood recurs throughout.');
    expect(system.content).toContain('Holinshed chronicle notes'); // context doc titles
    expect(system.content).toContain('Class handout');
    expect(system.content).toContain('The real Macbeth reigned for seventeen years.');
    expect(system.content).toContain('Link this to the dagger scene.'); // existing annotation
    // Behaviour rules present.
    expect(system.content).toMatch(/NEVER rewrite the student's essay text/);
    expect(system.content).toMatch(/say so explicitly before answering from general knowledge/);

    // The sanitized history is forwarded verbatim after the system prompt.
    expect(args.messages.slice(1)).toEqual(messages);
  });

  it('omits temperature for reasoning models', async () => {
    const { client, create } = makeClient({ reply: 'ok', annotations: [] });
    await assistEssay({ essay: makeEssay(), messages: USER_TURN, model: 'o4-mini', client });
    expect(create.mock.calls[0][0].model).toBe('o4-mini');
    expect(create.mock.calls[0][0]).not.toHaveProperty('temperature');
  });

  it('drops out-of-bounds proposals, blanks unlocatable anchors, and snaps mangled anchors to verbatim slices', async () => {
    const { client } = makeClient({
      reply: 'Annotated.',
      annotations: [
        { paragraphIndex: 99, anchor: '', note: 'dropped: index out of bounds' },
        { paragraphIndex: -1, anchor: '', note: 'dropped: negative' },
        { paragraphIndex: '1', anchor: '', note: 'dropped: not an integer' },
        { paragraphIndex: 0, anchor: 'this text is nowhere in the paragraph', note: 'anchor blanked' },
        // Straight quotes + collapsed whitespace: must snap to the source's
        // curly-quoted verbatim slice via buildMatcher.
        { paragraphIndex: 1, anchor: '"will  have blood"', note: 'anchor snapped' },
        { paragraphIndex: 1, anchor: '', note: '   ' }, // dropped: empty note
      ],
    });

    const result = await assistEssay({ essay: makeEssay(), messages: USER_TURN, client });

    expect(result.annotations).toEqual([
      { paragraphIndex: 0, anchor: '', note: 'anchor blanked' },
      { paragraphIndex: 1, anchor: '“will have blood”', note: 'anchor snapped' },
    ]);
    // The snapped anchor is a literal slice of the source paragraph.
    expect(BODY2).toContain(result.annotations[1].anchor);
  });

  it('keeps at most 8 proposals and clamps notes to 2000 chars', async () => {
    const { client } = makeClient({
      reply: 'Lots of notes.',
      annotations: Array.from({ length: 12 }, (_, i) => ({
        paragraphIndex: i % 2,
        anchor: '',
        note: `note ${i} ${'x'.repeat(2500)}`,
      })),
    });

    const result = await assistEssay({ essay: makeEssay(), messages: USER_TURN, client });

    expect(result.annotations).toHaveLength(8);
    result.annotations.forEach((a) => expect(a.note).toHaveLength(2000));
  });

  it('drops every proposal when the essay has no parsed paragraphs', async () => {
    const { client } = makeClient({
      reply: 'No map yet.',
      annotations: [{ paragraphIndex: 0, anchor: '', note: 'nowhere to attach' }],
    });

    const result = await assistEssay({
      essay: makeEssay({ parsedStructure: null }),
      messages: USER_TURN,
      client,
    });

    expect(result.reply).toBe('No map yet.');
    expect(result.annotations).toEqual([]);
  });

  it('truncates the longest context docs at the 60k budget and labels them [truncated]', async () => {
    const { client, create } = makeClient({ reply: 'ok', annotations: [] });

    await assistEssay({
      essay: makeEssay(),
      contextDocs: [
        { title: 'Long study guide', content: 'a'.repeat(50000) },
        { title: 'Short notes', content: 'b'.repeat(30000) },
      ],
      messages: USER_TURN,
      client,
    });

    const system = create.mock.calls[0][0].messages[0].content;
    // Water-fill at 60k: the 30k doc stays whole, the 50k doc is cut to 30k.
    expect(system).toContain('Long study guide [truncated]');
    expect(system).not.toContain('Short notes [truncated]');
    expect(system).toContain('b'.repeat(30000));
    expect(system).toContain('a'.repeat(30000));
    expect(system).not.toContain('a'.repeat(30001));
  });

  it('rejects when the completion is truncated (finish_reason length)', async () => {
    const { client } = makeClient({ reply: 'cut off' }, 'length');
    await expect(assistEssay({ essay: makeEssay(), messages: USER_TURN, client }))
      .rejects.toThrow(/truncated/i);
  });

  it('rejects when the completion is not valid JSON', async () => {
    const { client } = makeClient('this is not json');
    await expect(assistEssay({ essay: makeEssay(), messages: USER_TURN, client }))
      .rejects.toThrow(/unparseable/i);
  });
});

describe('fitContextDocs', () => {
  it('keeps every doc whole when the library fits the budget', () => {
    const fitted = fitContextDocs([
      { title: 'A', content: 'x'.repeat(100) },
      { title: 'B', content: 'y'.repeat(200) },
    ], 60000);
    expect(fitted).toEqual([
      { title: 'A', content: 'x'.repeat(100), truncated: false },
      { title: 'B', content: 'y'.repeat(200), truncated: false },
    ]);
  });

  it('never cuts a short doc to make room for a long one', () => {
    const fitted = fitContextDocs([
      { title: 'Huge', content: 'x'.repeat(1000) },
      { title: 'Tiny', content: 'y'.repeat(10) },
    ], 100);
    const tiny = fitted.find((d) => d.title === 'Tiny');
    const huge = fitted.find((d) => d.title === 'Huge');
    expect(tiny).toEqual({ title: 'Tiny', content: 'y'.repeat(10), truncated: false });
    expect(huge.truncated).toBe(true);
    expect(huge.content).toHaveLength(90);
    // Total lands on the budget.
    expect(fitted.reduce((sum, d) => sum + d.content.length, 0)).toBe(100);
  });

  it('drops empty docs and defaults missing titles', () => {
    const fitted = fitContextDocs([
      { title: '', content: 'something' },
      { title: 'Empty', content: '' },
    ]);
    expect(fitted).toEqual([{ title: 'Untitled document', content: 'something', truncated: false }]);
  });
});

describe('explainEssay', () => {
  it('throws a 503 when no client is available', async () => {
    await expect(explainEssay({ essay: makeEssay() }))
      .rejects.toMatchObject({ status: 503 });
  });

  it("throws a 400 'Set up practice first.' when there are no body paragraphs", async () => {
    const { client } = makeClient({ explanations: [] });
    await expect(explainEssay({ essay: makeEssay({ parsedStructure: null }), client }))
      .rejects.toMatchObject({ status: 400, message: 'Set up practice first.' });
  });

  it('explains a single paragraph, keeping its REAL index in the prompt', async () => {
    const { client, create } = makeClient({
      explanations: [{ paragraphIndex: 1, note: 'This paragraph traces guilt through recurring blood imagery.' }],
    });

    const explanations = await explainEssay({ essay: makeEssay(), paragraphIndex: 1, client });

    const prompt = create.mock.calls[0][0].messages[1].content;
    expect(prompt).toContain('[P1]');
    expect(prompt).not.toContain('[P0]'); // the other paragraph is not sent
    expect(explanations).toEqual([
      { paragraphIndex: 1, note: 'This paragraph traces guilt through recurring blood imagery.' },
    ]);
  });

  it('falls back to explaining everything when paragraphIndex is out of bounds', async () => {
    const { client, create } = makeClient({
      explanations: [{ paragraphIndex: 0, note: 'A valid explanation of the first paragraph goes here.' }],
    });
    await explainEssay({ essay: makeEssay(), paragraphIndex: 99, client });
    const prompt = create.mock.calls[0][0].messages[1].content;
    expect(prompt).toContain('[P0]');
    expect(prompt).toContain('[P1]');
  });

  it('sends the numbered full paragraphs and returns validated explanations', async () => {
    const { client, create } = makeClient({
      explanations: [
        { paragraphIndex: 0, note: 'This paragraph argues Macbeth doubts himself, using his own soliloquy as evidence.' },
        { paragraphIndex: 7, note: 'dropped: out of bounds' },
        { paragraphIndex: 1, note: 'This paragraph traces guilt through recurring blood imagery.' },
        { paragraphIndex: 0, note: 'dropped: duplicate index' },
        { paragraphIndex: 1.5, note: 'dropped: not an integer' },
      ],
    });

    const explanations = await explainEssay({ essay: makeEssay(), model: 'gpt-5.5', client });

    expect(explanations).toEqual([
      { paragraphIndex: 0, note: 'This paragraph argues Macbeth doubts himself, using his own soliloquy as evidence.' },
      { paragraphIndex: 1, note: 'This paragraph traces guilt through recurring blood imagery.' },
    ]);

    const args = create.mock.calls[0][0];
    expect(args.model).toBe('gpt-5.5');
    expect(args.response_format).toEqual({ type: 'json_object' });
    expect(args.max_completion_tokens).toBe(4000);
    const userTurn = args.messages[1].content;
    expect(userTurn).toContain(`[P0]\n${BODY1}`); // full text, numbered
    expect(userTurn).toContain(`[P1]\n${BODY2}`);
  });

  it('clamps explanation notes to 2000 chars', async () => {
    const { client } = makeClient({
      explanations: [{ paragraphIndex: 0, note: 'n'.repeat(2500) }],
    });
    const explanations = await explainEssay({ essay: makeEssay(), client });
    expect(explanations[0].note).toHaveLength(2000);
  });

  it('rejects when every explanation is unusable', async () => {
    const { client } = makeClient({
      explanations: [{ paragraphIndex: 42, note: 'out of bounds' }],
    });
    await expect(explainEssay({ essay: makeEssay(), client }))
      .rejects.toThrow(/no usable explanations/i);
  });

  it('rejects truncated or unparseable output', async () => {
    const truncated = makeClient({ explanations: [] }, 'length');
    await expect(explainEssay({ essay: makeEssay(), client: truncated.client }))
      .rejects.toThrow(/truncated/i);

    const garbled = makeClient('nope');
    await expect(explainEssay({ essay: makeEssay(), client: garbled.client }))
      .rejects.toThrow(/unparseable/i);
  });
});
