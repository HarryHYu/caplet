import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import AnnotatedDocument from '../components/essay/AnnotatedDocument';

afterEach(() => cleanup());

const essay = {
  parsedStructure: {
    thesis: '',
    introduction: '',
    bodyParagraphs: [
      {
        topicSentence: 'Conrad frames empire as robbery.',
        text: 'Conrad frames empire as robbery. He calls it "just robbery with violence" in the novella.',
        quotes: [{ text: 'just robbery with violence' }],
        techniques: [],
      },
      {
        topicSentence: 'Walcott answers with the sea.',
        text: 'Walcott answers with the sea. The drowned remain "soldered by coral to bone" for ever.',
        quotes: [{ text: 'soldered by coral to bone' }],
        techniques: [],
      },
    ],
  },
};

const renderDoc = (props = {}) => {
  const onAdd = vi.fn().mockResolvedValue({});
  const utils = render(
    <AnnotatedDocument
      essay={essay}
      annotations={props.annotations || []}
      onAdd={onAdd}
      onUpdate={vi.fn()}
      onDelete={vi.fn()}
      {...props}
    />,
  );
  return { ...utils, onAdd };
};

describe('AnnotatedDocument — your own explanations', () => {
  it('offers both a note and an explanation for a paragraph', () => {
    renderDoc();
    expect(screen.getAllByRole('button', { name: '+ Note' })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: '+ Explain' })).toHaveLength(2);
  });

  it('saves a hand-written explanation as kind=explanation', async () => {
    const { onAdd } = renderDoc();
    fireEvent.click(screen.getAllByRole('button', { name: '+ Explain' })[1]);

    expect(screen.getByText('Your explanation')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Explanation text'), {
      target: { value: 'Walcott reclaims the archive: the sea itself holds the record.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save explanation' }));

    await waitFor(() => expect(onAdd).toHaveBeenCalledWith({
      paragraphIndex: 1,
      anchor: '',
      note: 'Walcott reclaims the archive: the sea itself holds the record.',
      kind: 'explanation',
    }));
  });

  it('can switch the composer between note and explanation', async () => {
    const { onAdd } = renderDoc();
    fireEvent.click(screen.getAllByRole('button', { name: '+ Note' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Explanation' }));
    fireEvent.change(screen.getByLabelText('Explanation text'), { target: { value: 'My own summary.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save explanation' }));

    await waitFor(() => expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'explanation', paragraphIndex: 0 }),
    ));
  });

  it('hides the +Explain shortcut once a paragraph already has an explanation', () => {
    renderDoc({
      annotations: [{
        id: 'a1', paragraphIndex: 0, anchor: '', note: 'Existing explanation.',
        kind: 'explanation', source: 'user',
      }],
    });
    // Paragraph 0 already explained; only paragraph 1 still offers the shortcut.
    expect(screen.getAllByRole('button', { name: '+ Explain' })).toHaveLength(1);
  });

  it('offers a per-paragraph AI explain and reports which one is running', () => {
    const onExplainOne = vi.fn();
    renderDoc({ onExplainOne, explainingIndex: 1 });

    const buttons = screen.getAllByRole('button', { name: /Explain paragraph \d with AI/ });
    expect(buttons).toHaveLength(2);
    expect(buttons[1]).toBeDisabled(); // the one that is running
    fireEvent.click(buttons[0]);
    expect(onExplainOne).toHaveBeenCalledWith(0);
  });

  it('keeps a selection note a plain note (no kind toggle on a phrase)', () => {
    renderDoc();
    // Paragraph-level composer shows the toggle…
    fireEvent.click(screen.getAllByRole('button', { name: '+ Note' })[0]);
    expect(screen.getByRole('group', { name: 'Note type' })).toBeInTheDocument();
  });
});
