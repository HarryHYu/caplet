import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import MathText from '../components/MathText';

/**
 * MathText wraps markdown paragraphs in `span.block` so multi-paragraph
 * strings stack. Inside a fill-in-the-blank template that wrapper is wrong:
 * every run of prose between the input boxes became its own line, so the
 * sentence rendered stacked vertically instead of flowing around the blanks.
 */
describe('MathText', () => {
    it('wraps paragraphs in a block span by default so multiple stack', () => {
        const { container } = render(<MathText>{'first\n\nsecond'}</MathText>);
        const blocks = container.querySelectorAll('span.block');
        expect(blocks.length).toBe(2);
        expect(blocks[0].textContent).toBe('first');
        expect(blocks[1].textContent).toBe('second');
    });

    it('keeps the run inline with `inline`, so it flows on one line', () => {
        const { container } = render(<MathText inline>how ambition corrodes conscience.</MathText>);
        expect(container.querySelectorAll('span.block').length).toBe(0);
        expect(container.textContent).toBe('how ambition corrodes conscience.');
    });

    it('still renders markdown emphasis when inline', () => {
        const { container } = render(<MathText inline>{'a **bold** word'}</MathText>);
        expect(container.querySelector('strong')?.textContent).toBe('bold');
        expect(container.querySelectorAll('span.block').length).toBe(0);
    });

    it('renders nothing for null children', () => {
        const { container } = render(<MathText>{null}</MathText>);
        expect(container.textContent).toBe('');
    });
});
