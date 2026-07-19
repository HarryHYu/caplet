import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../services/api', () => ({
  default: {
    getRecommendations: vi.fn(),
    getSyllabusProgress: vi.fn(),
    logRecEvents: vi.fn(),
  },
}));

import api from '../services/api';
import RecommendedLessons from '../components/study/RecommendedLessons';
import SyllabusProgress from '../components/study/SyllabusProgress';

const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('RecommendedLessons (ported engine feed)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.logRecEvents.mockResolvedValue(null);
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('renders engine cards with reason + logs a shown event', async () => {
    api.getRecommendations.mockResolvedValue({ recommendations: [
      { id: 'r1', type: 'syllabus_gap', title: 'Market equilibrium', subtitle: 'Economics · Module 2', reason: 'Not started — a mark you can’t earn yet.', urgency: 'low', estimatedMins: 22, difficulty: 'easy', action: { type: 'practice', subject: 'Economics', topic: 'Market equilibrium' }, lessons: [] },
    ] });

    wrap(<RecommendedLessons />);

    expect(await screen.findByText('Market equilibrium')).toBeInTheDocument();
    expect(screen.getByText(/a mark you can’t earn yet/i)).toBeInTheDocument();
    await waitFor(() => expect(api.getRecommendations).toHaveBeenCalledWith(8));
    // Shown feedback is sent to the engine.
    await waitFor(() => expect(api.logRecEvents).toHaveBeenCalled());
    expect(api.logRecEvents.mock.calls[0][0][0]).toMatchObject({ recId: 'r1', action: 'shown' });
  });

  it('logs a clicked event and links to practice for practice-type actions', async () => {
    api.getRecommendations.mockResolvedValue({ recommendations: [
      { id: 'r2', type: 'syllabus_gap', title: 'Elasticity', subtitle: 'Economics · Module 2', reason: 'Weak spot.', urgency: 'high', estimatedMins: 15, difficulty: 'hard', action: { type: 'practice', subject: 'Economics' }, lessons: [] },
    ] });

    wrap(<RecommendedLessons />);
    const card = await screen.findByText('Elasticity');
    const link = card.closest('a');
    expect(link.getAttribute('href')).toContain('/practice');
    fireEvent.click(link);
    expect(api.logRecEvents.mock.calls.some((c) => c[0][0]?.action === 'clicked')).toBe(true);
  });

  it('shows a friendly empty state (not a blank gap) when there are no recommendations', async () => {
    api.getRecommendations.mockResolvedValue({ recommendations: [] });
    wrap(<RecommendedLessons />);
    // The heading always renders, and an explanatory empty state replaces the cards.
    expect(await screen.findByText('No recommendations yet')).toBeInTheDocument();
    expect(screen.getByText('Recommended lessons')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /start practising/i })).toBeInTheDocument();
  });
});

describe('SyllabusProgress (ported HSC syllabus points)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getSyllabusProgress.mockResolvedValue({
      subject: 'Economics',
      overallHscReadiness: 42,
      year11Readiness: 60,
      modules: [
        { module: 1, moduleName: 'Introduction to Economics', year: 11, moduleReadiness: 50, totalPoints: 5, masteredCount: 1, practicedCount: 3, points: [
          { id: 'p1', code: 'EC.M1.1.1', topic: 'Nature of Economics', inquiryQuestion: 'Q', dotPoint: 'Define scarcity and opportunity cost', weight: 2, masteryLevel: 40, practiceCount: 2 },
        ] },
      ],
    });
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('loads the subject breakdown and overall readiness', async () => {
    wrap(<SyllabusProgress />);
    expect(await screen.findByText('Introduction to Economics')).toBeInTheDocument();
    expect(screen.getByText('42%')).toBeInTheDocument();
    await waitFor(() => expect(api.getSyllabusProgress).toHaveBeenCalledWith('Economics'));
  });

  it('expands a module to reveal its dot points', async () => {
    wrap(<SyllabusProgress />);
    const moduleBtn = (await screen.findByText('Introduction to Economics')).closest('button');
    fireEvent.click(moduleBtn);
    expect(await screen.findByText(/Define scarcity and opportunity cost/i)).toBeInTheDocument();
    expect(screen.getByText('EC.M1.1.1')).toBeInTheDocument();
  });

  it('refetches when the subject changes', async () => {
    wrap(<SyllabusProgress />);
    await screen.findByText('Introduction to Economics');
    fireEvent.click(screen.getByRole('button', { name: 'Physics' }));
    await waitFor(() => expect(api.getSyllabusProgress).toHaveBeenCalledWith('Physics'));
  });
});
