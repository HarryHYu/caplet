import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

// Mock the API singleton — the list view calls getEssays and getDueReviewItems
// (for the per-essay "N due" badges) in parallel on mount.
vi.mock('../services/api', () => ({
  default: {
    getEssays: vi.fn().mockResolvedValue({ essays: [] }),
    getEssay: vi.fn(),
    getDueReviewItems: vi.fn().mockResolvedValue({ items: [] }),
    getProxiedImageSrc: (u) => u,
  },
}));

import EssayMemoriser from '../pages/EssayMemoriser';
import api from '../services/api';

describe('EssayMemoriser', () => {
  it('keeps the library calm, then opens the new-essay composer on demand', async () => {
    render(<EssayMemoriser />);
    expect(await screen.findByText(/Learn it by heart/i)).toBeInTheDocument();
    expect(screen.getByText(/Start a new essay/i)).toBeInTheDocument();
    expect(await screen.findByText(/No essays yet/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Add essay/i }));
    expect(screen.getByText(/Add an essay/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Parse with AI/i })).toBeInTheDocument();
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
});
