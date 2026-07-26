import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const api = vi.hoisted(() => ({
  getReviewQueue: vi.fn(),
  submitReview: vi.fn(),
}));

vi.mock('../services/api', () => ({ default: api }));

import Review from '../pages/Review';

const queue = {
  totalDue: 3,
  estimatedMinutes: 5,
  groups: [
    { id: 'outcomes', label: 'Economics outcomes', rationale: 'Strengthen concepts that are due or recently missed.', count: 1, estimatedMinutes: 2 },
    { id: 'savedSlides', label: 'Saved lesson slides', rationale: 'Retrieve the key ideas you chose to keep.', count: 1, estimatedMinutes: 2 },
    { id: 'essays', label: 'Essay paragraphs', rationale: 'Rebuild important arguments and evidence.', count: 1, estimatedMinutes: 1 },
  ],
  items: [
    {
      id: 'outcome:o1',
      itemType: 'outcome',
      itemId: 'o1',
      sourceLabel: 'ECO-11-02 · Markets and institutions',
      prompt: 'Explain how information asymmetry can cause adverse selection.',
      responseType: 'short_answer',
      options: [],
      answer: 'Hidden information can cause lower-quality goods to drive out higher-quality goods.',
      explanation: 'Buyers cannot reliably distinguish quality before purchase.',
      misconception: 'Information is unevenly distributed between buyers and sellers.',
      repairPrompt: 'Apply adverse selection to an insurance market.',
      repairResponseType: 'short_answer',
      repairOptions: [],
      repairAnswer: 'Higher-risk people are more likely to buy coverage when insurers cannot observe risk.',
    },
    {
      id: 'savedSlide:s1',
      itemType: 'savedSlide',
      itemId: 's1',
      sourceLabel: 'Economics · Market failure',
      prompt: 'Explain the key idea from the saved slide.',
      responseType: 'short_answer',
      options: [],
      answer: 'Market failure occurs when resources are not allocated efficiently.',
      repairPrompt: 'Give a new example of market failure.',
      repairResponseType: 'short_answer',
      repairOptions: [],
      repairAnswer: 'Pollution is a negative externality.',
    },
    {
      id: 'essayParagraph:e1:0',
      itemType: 'essayParagraph',
      itemId: 'e1:0',
      sourceLabel: 'Essay · Body paragraph 1',
      prompt: 'Reconstruct the argument of body paragraph 1.',
      responseType: 'extended_response',
      options: [],
      answer: 'The paragraph argues that...',
      repairPrompt: 'Write the topic sentence and one piece of evidence.',
      repairResponseType: 'extended_response',
      repairOptions: [],
      repairAnswer: 'The topic sentence is...',
    },
  ],
};

describe('Review journey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getReviewQueue.mockResolvedValue({ queue });
    api.submitReview.mockResolvedValue({ reviewItem: {} });
  });

  it('starts from the mixed queue and advances after a successful recall', async () => {
    render(<MemoryRouter><Review /></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: 'Your review is lined up.' })).toBeInTheDocument();
    expect(screen.getByText('Economics outcomes')).toBeInTheDocument();
    expect(screen.getByText('Saved lesson slides')).toBeInTheDocument();
    expect(screen.getByText('Essay paragraphs')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Start 5-minute review/i }));
    expect(screen.getByRole('heading', { name: /information asymmetry/i })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Your answer'), { target: { value: 'Buyers know less than sellers.' } });
    fireEvent.click(screen.getByRole('button', { name: /Reveal answer/i }));
    expect(screen.getByText(/Hidden information can cause/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Got it/i }));
    await waitFor(() => expect(api.submitReview).toHaveBeenCalledWith('outcome', 'o1', 'pass'));
    expect(await screen.findByRole('heading', { name: /key idea from the saved slide/i })).toBeInTheDocument();
  });

  it('turns a miss into a repair question before continuing', async () => {
    render(<MemoryRouter><Review /></MemoryRouter>);

    fireEvent.click(await screen.findByRole('button', { name: /Start 5-minute review/i }));
    fireEvent.change(screen.getByLabelText('Your answer'), { target: { value: 'I am not sure.' } });
    fireEvent.click(screen.getByRole('button', { name: /Reveal answer/i }));
    fireEvent.click(screen.getByRole('button', { name: /Missed it/i }));

    expect(await screen.findByRole('heading', { name: 'Fix what slipped.' })).toBeInTheDocument();
    expect(screen.getByText('Apply adverse selection to an insurance market.')).toBeInTheDocument();
    expect(api.submitReview).toHaveBeenCalledWith('outcome', 'o1', 'fail');

    fireEvent.change(screen.getByLabelText('Your answer'), { target: { value: 'Riskier people self-select into insurance.' } });
    fireEvent.click(screen.getByRole('button', { name: /Try the new question/i }));
    expect(screen.getByText(/Higher-risk people are more likely/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Continue review/i }));

    expect(await screen.findByRole('heading', { name: /key idea from the saved slide/i })).toBeInTheDocument();
  });
});
