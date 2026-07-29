import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

// Mock the API singleton — the list view calls getEssays and getDueReviewItems
// (for the per-essay "N due" badges) in parallel on mount.
vi.mock('../services/api', () => ({
  default: {
    getEssays: vi.fn().mockResolvedValue({ essays: [] }),
    getEssay: vi.fn(),
    getDueReviewItems: vi.fn().mockResolvedValue({ items: [] }),
    submitReview: vi.fn().mockResolvedValue({ reviewItem: {} }),
    getProxiedImageSrc: (u) => u,
  },
}));

import EssayMemoriser, { GuidedTypeMode } from '../pages/EssayMemoriser';
import api from '../services/api';

describe('EssayMemoriser', () => {
  it('keeps the library calm, then opens the new-essay composer on demand', async () => {
    render(<EssayMemoriser />);
    expect(await screen.findByText(/Learn it by heart/i)).toBeInTheDocument();
    expect(screen.getByText(/Start a new essay/i)).toBeInTheDocument();
    expect(await screen.findByText(/No essays yet/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Add essay/i }));
    expect(screen.getByText(/Add an essay/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Set up practice/i })).toBeInTheDocument();
    expect(screen.getByText(/uses AI to identify the essay’s structure/i)).toBeInTheDocument();
    // PDF upload affordance is present (reuses the existing extractor)
    expect(screen.getByText(/Upload PDF/i)).toBeInTheDocument();
  });

  it('presents parsed essays as a short learning path and keeps extra drills secondary', async () => {
    const parsedEssay = {
      id: 'essay-1',
      title: 'Macbeth: ambition',
      parsed: true,
      paragraphCount: 1,
      parsedStructure: {
        thesis: 'Shakespeare presents ambition as destructive.',
        bodyParagraphs: [{ text: 'Macbeth chooses ambition over loyalty.', quotes: [], techniques: [] }],
        conclusion: 'Ambition destroys Macbeth.',
      },
    };
    api.getEssays.mockResolvedValueOnce({ essays: [parsedEssay] });
    api.getEssay.mockResolvedValueOnce({ essay: parsedEssay });

    render(<EssayMemoriser />);
    const essayCard = await screen.findByRole('button', { name: /Macbeth: ambition/i });
    fireEvent.click(essayCard);

    expect(await screen.findByText(/Your learning path/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Understand it/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Rebuild it/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Write it/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Keep it fresh/i })).toBeInTheDocument();
    expect(screen.getByText(/Extra drills/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Rebuild it/i }));
    expect(await screen.findByText(/Step 2 of 4/i)).toBeInTheDocument();
    expect(screen.getByText(/Change activity/i)).toBeInTheDocument();
  });

  it('penalises each uniquely revealed word once and persists hint-aware completion scoring', () => {
    const essay = {
      id: 'essay-hints',
      parsedStructure: {
        bodyParagraphs: [{ text: 'Alpha beta gamma delta', quotes: [], techniques: [] }],
      },
    };
    render(<GuidedTypeMode essay={essay} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Alpha' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('100%')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Peek word' }));
    expect(screen.getByText('97%')).toBeInTheDocument();
    expect(screen.getByLabelText(/beta, revealed with a hint/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Peek word: beta/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Peek word' }));
    expect(screen.getByText('97%')).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'beta' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: 'Peek word' }));
    expect(screen.getByText('94%')).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'gamma' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.change(input, { target: { value: 'delta' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: /Got it/i }));

    expect(api.submitReview).toHaveBeenCalledWith(
      'essayParagraph',
      'essay-hints:0',
      'pass',
      { mode: 'word_by_word', accuracy: 94, hintCount: 2 },
    );
  });
});
