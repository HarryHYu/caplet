import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// Mock the API singleton — the library calls getEssays and getDueReviewItems
// in parallel on mount; the workspace loads its essay by id from the route.
vi.mock('../services/api', () => ({
  default: {
    getEssays: vi.fn().mockResolvedValue({ essays: [] }),
    getEssay: vi.fn(),
    createEssay: vi.fn(),
    updateEssay: vi.fn(),
    parseEssay: vi.fn(),
    deleteEssay: vi.fn(),
    request: vi.fn(),
    getDueReviewItems: vi.fn().mockResolvedValue({ items: [] }),
    submitReview: vi.fn().mockResolvedValue({ reviewItem: {} }),
    getProxiedImageSrc: (u) => u,
  },
}));

import EssayMemoriser, { GuidedTypeMode } from '../pages/EssayMemoriser';
import api from '../services/api';

afterEach(() => cleanup());

const renderAt = (path) => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/essays" element={<EssayMemoriser />} />
      <Route path="/essays/:essayId" element={<EssayMemoriser />} />
    </Routes>
  </MemoryRouter>,
);

const parsedEssay = {
  id: 'essay-1',
  title: 'Macbeth: ambition',
  originalText: 'Shakespeare presents ambition as destructive.\n\nMacbeth chooses ambition over loyalty.\n\nAmbition destroys Macbeth.',
  parsedStructure: {
    thesis: 'Shakespeare presents ambition as destructive.',
    introduction: 'Shakespeare presents ambition as destructive.',
    bodyParagraphs: [{ topicSentence: 'Macbeth chooses ambition over loyalty.', text: 'Macbeth chooses ambition over loyalty.', quotes: [], techniques: [] }],
    conclusion: 'Ambition destroys Macbeth.',
  },
};

describe('EssayMemoriser', () => {
  it('keeps the library calm, then opens the new-essay composer with a model picker', async () => {
    renderAt('/essays');
    expect(await screen.findByText(/Learn it by heart/i)).toBeInTheDocument();
    expect(screen.getByText(/Start a new essay/i)).toBeInTheDocument();
    expect(await screen.findByText(/No essays yet/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Add essay/i }));
    expect(screen.getByText(/Add an essay/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Set up practice/i })).toBeInTheDocument();
    expect(screen.getByText(/uses AI to identify the essay’s structure/i)).toBeInTheDocument();
    expect(screen.getByText(/Upload PDF/i)).toBeInTheDocument();
    // The AI model is choosable before generating, like the lesson generator.
    fireEvent.click(screen.getByRole('button', { name: /GPT-5\.4 Mini/i }));
    expect(screen.getByRole('option', { name: /GPT-5\.5/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('option', { name: /GPT-5\.5/i }));
    expect(screen.getByRole('button', { name: /GPT-5\.5/i })).toBeInTheDocument();
  });

  it('links each library card to its own workspace route', async () => {
    api.getEssays.mockResolvedValueOnce({ essays: [{ id: 'essay-1', title: 'Macbeth: ambition', parsed: true, paragraphCount: 1, wordCount: 18, excerpt: 'Shakespeare presents…' }] });
    renderAt('/essays');
    const card = await screen.findByRole('link', { name: /Macbeth: ambition/i });
    expect(card).toHaveAttribute('href', '/essays/essay-1');
  });

  it('opens a workspace with Overview, Practice and Edit sections', async () => {
    api.getEssay.mockResolvedValue({ essay: parsedEssay });
    renderAt('/essays/essay-1');

    expect(await screen.findByRole('heading', { name: /Macbeth: ambition/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /All essays/i })).toHaveAttribute('href', '/essays');
    expect(screen.getByRole('button', { name: /Overview/i })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: /Practice/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Edit$/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Practice/i }));
    expect(await screen.findByText(/Your learning path/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Rebuild it/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sentences/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Write it/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Keep it fresh/i })).toBeInTheDocument();
    // Unavailable drills (no quotes, one paragraph) are hidden, not dead ends.
    expect(screen.queryByRole('button', { name: /Quote cards/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Paragraph order/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Rebuild it/i }));
    expect(await screen.findByText(/Step 1 of 4/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /All activities/i })).toBeInTheDocument();
  });

  it('edits the essay in place and rescans with the chosen model', async () => {
    api.getEssay.mockResolvedValue({ essay: parsedEssay });
    const updated = { ...parsedEssay, originalText: 'A new body paragraph only.', parsedStructure: null };
    api.updateEssay.mockResolvedValueOnce({ essay: updated });
    api.parseEssay.mockResolvedValueOnce({ essay: { ...updated, parsedStructure: parsedEssay.parsedStructure } });

    renderAt('/essays/essay-1?tab=edit');
    const textarea = await screen.findByLabelText(/Essay text/i);
    fireEvent.change(textarea, { target: { value: 'A new body paragraph only.' } });
    fireEvent.click(screen.getByRole('button', { name: /Save & rescan/i }));

    await waitFor(() => expect(api.updateEssay).toHaveBeenCalledWith('essay-1', {
      title: 'Macbeth: ambition',
      text: 'A new body paragraph only.',
    }));
    await waitFor(() => expect(api.parseEssay).toHaveBeenCalledWith('essay-1', expect.objectContaining({ model: 'gpt-5.4-mini' })));
  });

  it('requires confirmation before deleting and surfaces delete failures', async () => {
    api.getEssay.mockResolvedValue({ essay: parsedEssay });
    api.deleteEssay.mockRejectedValueOnce(new Error('Network down'));

    renderAt('/essays/essay-1');
    await screen.findByRole('heading', { name: /Macbeth: ambition/i });

    fireEvent.click(screen.getByRole('button', { name: /^Delete$/i }));
    expect(screen.getByText(/There is no undo/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Delete essay/i }));

    expect(await screen.findByText(/Network down/i)).toBeInTheDocument();
    // The essay is still there — a failed delete never pretends to succeed.
    expect(screen.getByRole('heading', { name: /Macbeth: ambition/i })).toBeInTheDocument();
  });

  it('shows setup with a model picker when unparsed, without asking for AI permission on failure', async () => {
    const savedEssay = { id: 'essay-2', title: 'Macbeth', originalText: 'Power corrupts Macbeth.', parsedStructure: null };
    api.getEssay.mockResolvedValue({ essay: savedEssay });
    api.parseEssay.mockRejectedValueOnce(new Error('AI assistance is temporarily paused.'));

    renderAt('/essays/essay-2');
    expect(await screen.findByRole('button', { name: /Set up practice/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Set up practice/i }));

    expect(await screen.findByText(/AI assistance is temporarily paused/i)).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(api.request).not.toHaveBeenCalledWith('/privacy/consents', expect.anything());
    expect(screen.getByRole('button', { name: /Try setup again/i })).toBeInTheDocument();
  });

  it('scores typed words with smart-quote tolerance', async () => {
    const essay = {
      id: 'essay-quotes',
      parsedStructure: {
        bodyParagraphs: [{ text: 'It’s Macbeth’s downfall', quotes: [], techniques: [] }],
      },
    };
    render(<GuidedTypeMode essay={essay} />);
    const input = screen.getByRole('textbox');
    // Typed with a straight apostrophe; target has curly ones.
    fireEvent.change(input, { target: { value: "It's" } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('100%')).toBeInTheDocument();
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
