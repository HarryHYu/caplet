import { describe, it, expect } from 'vitest';
import {
  makeCloze,
  buildTopicSentenceCloze,
  buildQuoteCards,
  buildParagraphOrder,
  lastSentence,
  paragraphItemId,
  quoteItemId,
  highlightSpansInText,
  buildAnnotatedParagraph,
  findQuoteSpans,
  isLikelyQuote,
} from '../lib/essaySlides';

const structure = {
  thesis: 'Power corrupts those who wield it without restraint.',
  bodyParagraphs: [
    {
      topicSentence: 'Shakespeare presents ambition as a corrosive force.',
      text: 'Shakespeare presents ambition as a corrosive force. "Vaulting ambition" drives Macbeth. It ends in ruin.',
      quotes: [{ text: 'Vaulting ambition', highLeverage: true }],
      techniques: ['metaphor'],
    },
    {
      topicSentence: 'Guilt manifests physically throughout the play.',
      text: 'Guilt manifests physically throughout the play. "Out, damned spot" reveals her unraveling, for "blood will have blood" in the end.',
      quotes: [
        { text: 'Out, damned spot', highLeverage: false },
        { text: 'blood will have blood', highLeverage: true },
      ],
      techniques: ['symbolism', 'imagery'],
    },
  ],
  conclusion: 'Thus the tragedy warns against unchecked ambition.',
};

describe('makeCloze', () => {
  it('blanks the longest content words and keeps {{i}} order', () => {
    const cloze = makeCloze('Shakespeare presents ambition as a corrosive force.', 2);
    expect(cloze).not.toBeNull();
    // markers appear in textual order
    expect(cloze.template).toMatch(/\{\{0\}\}.*\{\{1\}\}/s);
    expect(cloze.blanks).toHaveLength(2);
    // every blanked answer is restorable into the template position
    cloze.blanks.forEach((b) => expect(b.answers[0].length).toBeGreaterThanOrEqual(5));
  });

  it('returns null when there is nothing meaningful to blank', () => {
    expect(makeCloze('it is on the way to a', 2)).toBeNull();
    expect(makeCloze('   ', 2)).toBeNull();
    expect(makeCloze('', 2)).toBeNull();
  });

  it('reconstructs the original sentence when blanks are filled back in', () => {
    const sentence = 'Guilt manifests physically throughout the play.';
    const cloze = makeCloze(sentence, 2);
    let rebuilt = cloze.template;
    cloze.blanks.forEach((b, i) => { rebuilt = rebuilt.replace(`{{${i}}}`, b.answers[0]); });
    expect(rebuilt).toBe(sentence);
  });
});

describe('buildTopicSentenceCloze', () => {
  it('produces a canonical fillblank slide', () => {
    const slide = buildTopicSentenceCloze(structure.bodyParagraphs[0], 0);
    expect(slide.type).toBe('fillblank');
    expect(slide.mode).toBe('textbox');
    expect(Array.isArray(slide.blanks)).toBe(true);
    expect(slide.template).toContain('{{0}}');
  });
});

describe('isLikelyQuote', () => {
  it('trusts mark-wrapped and mark-adjacent quotes', () => {
    expect(isLikelyQuote('He said "stop the car" now.', 'stop the car')).toBe(true);
    expect(isLikelyQuote('irrelevant', '“wrapped in curly marks”')).toBe(true);
    expect(isLikelyQuote('irrelevant', '‘curly single wrapped’')).toBe(true);
  });

  it('rejects prose spans and straight-single-wrapped junk from old parses', () => {
    // The possessive-apostrophe bug pattern: a slice of the student's own prose.
    expect(isLikelyQuote(
      "humanity's propensity to use violence, informed by Leopold II's atrocities.",
      's propensity to use violence, informed by Leopold II',
    )).toBe(false);
    expect(isLikelyQuote('any text', "'s propensity to use violence'")).toBe(false);
    expect(isLikelyQuote('plain prose with no marks at all', 'prose with no marks')).toBe(false);
  });
});

describe('buildQuoteCards', () => {
  it('drops stored quotes that are not visibly quotations', () => {
    const slide = buildQuoteCards({
      bodyParagraphs: [{
        text: "humanity's propensity to use violence informs the reading. \"the horror, the horror\" lingers.",
        quotes: [
          { text: 's propensity to use violence informs the reading', highLeverage: false },
          { text: 'the horror, the horror', highLeverage: true },
        ],
        techniques: [],
      }],
    });
    expect(slide.cards).toHaveLength(1);
    expect(slide.cards[0].front).toContain('the horror');
  });

  it('builds a carousel cards slide across all quotes with a consistent front', () => {
    const slide = buildQuoteCards(structure);
    expect(slide.type).toBe('cards');
    expect(slide.mode).toBe('carousel');
    expect(slide.cards).toHaveLength(3); // 1 + 2 quotes
    // No "high-leverage" starring — every card front is just the quote.
    slide.cards.forEach((c) => expect(c.front).not.toContain('⭐'));
    expect(slide.cards[0].front).toBe('Vaulting ambition');
    expect(slide.cards[0].back).toContain('metaphor');
  });

  it('returns null when there are no quotes', () => {
    expect(buildQuoteCards({ bodyParagraphs: [{ quotes: [] }] })).toBeNull();
    expect(buildQuoteCards({})).toBeNull();
  });
});

describe('buildParagraphOrder', () => {
  it('builds an order slide from topic sentences in true order', () => {
    const slide = buildParagraphOrder(structure);
    expect(slide.type).toBe('order');
    expect(slide.items).toHaveLength(2);
    expect(slide.items[0]).toContain('Shakespeare presents ambition');
  });

  it('returns null with fewer than two paragraphs', () => {
    expect(buildParagraphOrder({ bodyParagraphs: [{ topicSentence: 'only one' }] })).toBeNull();
  });
});

describe('lastSentence', () => {
  it('returns the final sentence as the next-chunk cue', () => {
    expect(lastSentence('First. Second. Third.')).toBe('Third.');
    expect(lastSentence('Only one sentence here')).toBe('Only one sentence here');
    expect(lastSentence('')).toBe('');
  });
});

describe('highlightSpansInText', () => {
  it('splits text into plain and highlighted segments, preserving all content', () => {
    const text = 'Shakespeare presents ambition as a corrosive force. "Vaulting ambition" drives Macbeth.';
    const segments = highlightSpansInText(text, [
      { needle: 'Shakespeare presents ambition as a corrosive force.', type: 'topic' },
      { needle: 'Vaulting ambition', type: 'quote', meta: { highLeverage: true } },
    ]);
    expect(segments.map((s) => s.text).join('')).toBe(text);
    expect(segments[0].type).toBe('topic');
    expect(segments.some((s) => s.type === 'quote' && s.meta.highLeverage)).toBe(true);
  });

  it('drops overlapping markers, keeping the earliest', () => {
    const segments = highlightSpansInText('hello world', [
      { needle: 'hello world', type: 'topic' },
      { needle: 'world', type: 'quote' },
    ]);
    expect(segments).toHaveLength(1);
    expect(segments[0].type).toBe('topic');
  });

  it('skips markers not found verbatim in the text', () => {
    const segments = highlightSpansInText('hello world', [{ needle: 'nowhere', type: 'quote' }]);
    expect(segments).toEqual([{ text: 'hello world', type: 'plain' }]);
  });

  it('returns an empty array for empty text', () => {
    expect(highlightSpansInText('', [{ needle: 'x', type: 'topic' }])).toEqual([]);
  });
});

describe('buildAnnotatedParagraph', () => {
  it('highlights the topic sentence and every quote actually present in the text', () => {
    const segments = buildAnnotatedParagraph(structure.bodyParagraphs[1]);
    const joined = segments.map((s) => s.text).join('');
    expect(joined).toBe(structure.bodyParagraphs[1].text);
    expect(segments.filter((s) => s.type === 'quote')).toHaveLength(2);
    expect(segments.find((s) => s.type === 'topic')).toBeTruthy();
  });

  it('silently skips quotes that are not verbatim, mark-anchored substrings', () => {
    const paragraph = {
      topicSentence: 'Guilt manifests physically.',
      text: 'Guilt manifests physically. "Out, damned spot" reveals her unraveling.',
      quotes: [
        { text: 'Out, damned spot', highLeverage: false },
        { text: 'a paraphrase that never appears', highLeverage: true },
      ],
    };
    const segments = buildAnnotatedParagraph(paragraph);
    expect(segments.map((s) => s.text).join('')).toBe(paragraph.text);
    expect(segments.filter((s) => s.type === 'quote')).toHaveLength(1);
  });

  it('highlights every quote when all are verbatim substrings of the text', () => {
    const paragraph = {
      topicSentence: 'Shakespeare presents ambition as a corrosive force.',
      text: 'Shakespeare presents ambition as a corrosive force. "Vaulting ambition" drives him, yet "blood will have blood" seals his fate.',
      quotes: [
        { text: 'Vaulting ambition', highLeverage: true },
        { text: 'blood will have blood', highLeverage: true },
      ],
    };
    const segments = buildAnnotatedParagraph(paragraph);
    expect(segments.map((s) => s.text).join('')).toBe(paragraph.text);
    expect(segments.filter((s) => s.type === 'quote')).toHaveLength(2);
  });
});

describe('composite item ids', () => {
  it('formats paragraph and quote ids consistently with the backend', () => {
    expect(paragraphItemId('abc', 2)).toBe('abc:2');
    expect(quoteItemId('abc', 2, 0)).toBe('abc:q:2:0');
    // both share the `${essayId}:` prefix the backend deletes by
    expect(paragraphItemId('abc', 2).startsWith('abc:')).toBe(true);
    expect(quoteItemId('abc', 2, 0).startsWith('abc:')).toBe(true);
  });
});

describe('findQuoteSpans + annotated highlighting of integrated quotes', () => {
  it('marks short quotes integrated mid-sentence, at every occurrence', () => {
    const text = 'Walcott\u2019s "Patmos" reimagines "heaven" while "dust blown blood" recurs; the "dust blown blood" imagery accentuates violence.';
    const spans = findQuoteSpans(text);
    const contents = spans.map((s) => text.slice(s.start, s.end));
    expect(contents).toEqual(['Patmos', 'heaven', 'dust blown blood', 'dust blown blood']);
  });

  it('never includes the quotation marks in the highlighted span', () => {
    const text = 'He declares that "This island is heaven" today.';
    const segments = buildAnnotatedParagraph({ topicSentence: '', text, quotes: [] });
    const quoteSeg = segments.find((s) => s.type === 'quote');
    expect(quoteSeg.text).toBe('This island is heaven');
    expect(segments.map((s) => s.text).join('')).toBe(text);
  });

  it('lets a quote punch through the topic-sentence highlight', () => {
    const text = 'The persona declares "heaven away from cities" early. More prose follows.';
    const segments = buildAnnotatedParagraph({
      topicSentence: 'The persona declares "heaven away from cities" early.',
      text,
      quotes: [],
    });
    expect(segments.map((s) => s.type)).toEqual(['topic', 'quote', 'topic', 'plain']);
    expect(segments.map((s) => s.text).join('')).toBe(text);
  });

  it('ignores unbalanced straight marks (parity guard, matching the backend)', () => {
    const spans = findQuoteSpans('A stray " mark then "a real span" appears.');
    expect(spans).toEqual([]);
  });
});
