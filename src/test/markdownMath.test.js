import { describe, expect, it } from 'vitest';
import { normalizeMarkdownMath } from '../lib/markdownMath';

describe('normalizeMarkdownMath', () => {
  it('normalizes model-style inline and display LaTeX delimiters', () => {
    expect(normalizeMarkdownMath('Use \\(x^2 + 1\\) and then \\[\\sum_{r=0}^{4} r\\].'))
      .toBe('Use $x^2 + 1$ and then $$\\sum_{r=0}^{4} r$$.');
  });

  it('leaves dollar-delimited maths unchanged', () => {
    expect(normalizeMarkdownMath('Use $x^2$ or $$y = mx + b$$.'))
      .toBe('Use $x^2$ or $$y = mx + b$$.');
  });
});
