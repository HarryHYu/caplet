import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'teacher-1', role: 'instructor' }, isAuthenticated: true }),
}));

vi.mock('../services/api', () => ({
  default: {
    getSubjectPacks: vi.fn(),
    getSubjectPack: vi.fn(),
    createBusinessStudiesSubjectPack: vi.fn(),
    importSubjectPack: vi.fn(),
    resolveSubjectPackReviewItem: vi.fn(),
    reopenSubjectPackReviewItem: vi.fn(),
    publishSubjectPack: vi.fn(),
  },
}));

import CurriculumStudio from '../pages/CurriculumStudio';
import api from '../services/api';

function renderStudio(route = '/curriculum-studio') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/curriculum-studio" element={<CurriculumStudio />} />
        <Route path="/curriculum-studio/:packId" element={<CurriculumStudio />} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => cleanup());

describe('Curriculum Studio', () => {
  beforeEach(() => vi.clearAllMocks());

  it('offers the verified Business Studies vertical slice to a teacher', async () => {
    api.getSubjectPacks.mockResolvedValue({ subjectPacks: [] });
    renderStudio();

    expect(await screen.findByRole('heading', { name: 'Build a subject pack.' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create subject pack' })).toBeInTheDocument();
    expect(screen.getByText(/Nothing reaches students until every decision is resolved/i)).toBeInTheDocument();
  });

  it('keeps publishing locked while teacher decisions remain open', async () => {
    api.getSubjectPack.mockResolvedValue({
      subjectPack: {
        id: 'pack-1',
        title: 'HSC Business Studies',
        lifecycleStatus: 'in_review',
        readiness: {
          outcomes: { ready: 17, total: 20 },
          questions: { ready: 13, total: 14 },
          rubrics: { ready: 1, total: 2 },
          sources: { verified: 1, total: 1, percent: 100 },
          decisions: { open: 1, resolved: 4, total: 5 },
          canPublish: false,
        },
        reviewItems: [{
          id: 'review-1',
          itemType: 'outcome_boundary',
          title: 'Ambiguous outcome boundary',
          summary: 'Teacher judgement is required.',
          status: 'open',
          decisionOptions: [
            { id: 'retain', label: 'Retain one outcome', description: 'Preserve the official outcome.' },
            { id: 'split', label: 'Split the outcome', description: 'Track two outcomes.' },
          ],
          sourceCitation: { label: 'Official syllabus', section: 'Outcomes' },
        }],
      },
    });
    renderStudio('/curriculum-studio/pack-1');

    expect(await screen.findByRole('heading', { name: 'Business Studies is almost ready' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '1 decision before publishing' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Publish subject pack' })).toBeDisabled());
  });
});
