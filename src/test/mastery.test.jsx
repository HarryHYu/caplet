import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../services/api', () => ({
  default: {
    getMastery: vi.fn(),
    getNextRecommendation: vi.fn(),
  },
}));

import api from '../services/api';
import Mastery from '../pages/Mastery';

const MASTERY = {
  subject: 'economics',
  summary: {
    totalOutcomes: 2,
    mastered: 1,
    dueForReview: 1,
    averageProbability: 0.675,
  },
  outcomes: [
    {
      id: 'parent-1',
      code: 'E12',
      title: 'Economic management',
      description: 'Understand how policy influences economic outcomes.',
      parentId: null,
      probability: 0.85,
      confidence: 'high',
      evidenceCount: 7,
      retentionStrength: 0.72,
      nextReviewAt: '2099-07-10T00:00:00.000Z',
      misconceptions: [],
    },
    {
      id: 'child-1',
      code: 'E12.3',
      title: 'Monetary policy',
      description: 'Explain the transmission mechanism.',
      parentId: 'parent-1',
      probability: 0.5,
      confidence: 'medium',
      evidenceCount: 3,
      retentionStrength: 0.4,
      nextReviewAt: '2020-01-01T00:00:00.000Z',
      misconceptions: [{ code: 'cash-rate-is-inflation' }],
    },
  ],
};

const RECOMMENDATION = {
  recommendation: {
    type: 'practice',
    mode: 'weak-topic',
    subject: 'economics',
    reason: 'Your recent evidence shows this outcome needs reinforcement.',
    outcome: { id: 'child-1', code: 'E12.3', title: 'Monetary policy' },
    estimatedMinutes: 10,
  },
};

function renderPage(route = '/mastery?subject=economics') {
  return render(<MemoryRouter initialEntries={[route]}><Mastery /></MemoryRouter>);
}

describe('Mastery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getMastery.mockResolvedValue(MASTERY);
    api.getNextRecommendation.mockResolvedValue(RECOMMENDATION);
  });

  it('shows a hierarchical, evidence-backed mastery map and next action', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'My mastery.' })).toBeInTheDocument();
    expect(api.getMastery).toHaveBeenCalledWith('economics');
    expect(screen.getByText('68%')).toBeInTheDocument();
    expect(screen.getByText('Economic management')).toBeInTheDocument();
    expect(screen.getByText('Monetary policy')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Mastery probability: 85%' })).toBeInTheDocument();
    expect(screen.getByText('3 attempts')).toBeInTheDocument();
    expect(screen.getAllByText('Due for review')).toHaveLength(2);
    expect(screen.getByText('cash-rate-is-inflation')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Strengthen Monetary policy' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Start now/i })).toHaveAttribute(
      'href',
      '/practice?subject=economics&mode=weak-topic&outcomeId=child-1',
    );
  });

  it('offers a diagnostic when no mastery evidence exists', async () => {
    api.getMastery.mockResolvedValue({
      subject: 'economics',
      summary: { totalOutcomes: 0, mastered: 0, dueForReview: 0, averageProbability: 0 },
      outcomes: [],
    });
    api.getNextRecommendation.mockResolvedValue({ recommendation: null });

    renderPage();
    expect(await screen.findByText('Your mastery map is ready to begin.')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Start diagnostic/i })[0]).toHaveAttribute('href', '/practice?subject=economics&mode=diagnostic');
  });

  it('shows a recoverable error state', async () => {
    api.getMastery.mockRejectedValueOnce(new Error('Mastery service unavailable'));
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('Mastery service unavailable');
    api.getMastery.mockResolvedValue(MASTERY);
    fireEvent.click(screen.getByRole('button', { name: /Try again/i }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'My mastery.' })).toBeInTheDocument());
  });
});
