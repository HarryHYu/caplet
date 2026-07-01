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
      text: 'Guilt manifests physically throughout the play. "Out, damned spot" reveals her unraveling.',
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

describe('buildQuoteCards', () => {
  it('builds a carousel cards slide across all quotes, starring high-leverage ones', () => {
    const slide = buildQuoteCards(structure);
    expect(slide.type).toBe('cards');
    expect(slide.mode).toBe('carousel');
    expect(slide.cards).toHaveLength(3); // 1 + 2 quotes
    expect(slide.cards[0].front).toContain('⭐'); // high-leverage
    expect(slide.cards[0].back).toContain('metaphor');
    expect(slide.cards[1].front).not.toContain('⭐'); // not high-leverage
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
    // "blood will have blood" is a quote on the paragraph object but doesn't
    // occur verbatim in this paragraph's text — it must be silently skipped.
    expect(segments.filter((s) => s.type === 'quote')).toHaveLength(1);
    expect(segments.find((s) => s.type === 'topic')).toBeTruthy();
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
