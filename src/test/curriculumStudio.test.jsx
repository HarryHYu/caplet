import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
    createSubjectPackOutcome: vi.fn(),
    updateSubjectPackOutcome: vi.fn(),
    createSubjectPackQuestion: vi.fn(),
    updateSubjectPackQuestion: vi.fn(),
    transitionSubjectPackQuestion: vi.fn(),
    resolveSubjectPackReviewItem: vi.fn(),
    reopenSubjectPackReviewItem: vi.fn(),
    publishSubjectPack: vi.fn(),
    createSubjectPackVersion: vi.fn(),
    archiveSubjectPack: vi.fn(),
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

  it('keeps the pack library available so a teacher can add another subject', async () => {
    api.getSubjectPacks.mockResolvedValue({
      subjectPacks: [{ id: 'pack-1', title: 'HSC Business Studies', lifecycleStatus: 'published', readiness: { decisions: { open: 0 } } }],
    });
    renderStudio();

    expect(await screen.findByRole('heading', { name: 'Subject packs.' })).toBeInTheDocument();
    expect(screen.getByText('Published')).toBeInTheDocument();
    expect(screen.queryByText('published · Version 1')).not.toBeInTheDocument();
    screen.getByRole('button', { name: 'New subject pack' }).click();
    expect(await screen.findByRole('heading', { name: 'Build a subject pack.' })).toBeInTheDocument();
    screen.getByRole('button', { name: 'Back to subject packs' }).click();
    expect(await screen.findByRole('heading', { name: 'Subject packs.' })).toBeInTheDocument();
  });

  it('imports pasted syllabus text when a source file is unavailable', async () => {
    api.getSubjectPacks.mockResolvedValue({ subjectPacks: [] });
    api.importSubjectPack.mockResolvedValue({ subjectPack: { id: 'legal-pasted' } });
    api.getSubjectPack.mockResolvedValue({
      subjectPack: { id: 'legal-pasted', title: 'HSC Legal Studies', lifecycleStatus: 'in_review', outcomes: [], questions: [], reviewItems: [], readiness: {} },
    });
    renderStudio();

    await screen.findByRole('heading', { name: 'Build a subject pack.' });
    fireEvent.click(screen.getByRole('button', { name: /Import another syllabus/i }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Pack title' }), { target: { value: 'HSC Legal Studies' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Subject key' }), { target: { value: 'legal-studies' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Syllabus version' }), { target: { value: 'NSW-2025' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Syllabus outcome text' }), { target: { value: '[Page 12]\nLS11-1 examines how law regulates society' } });
    fireEvent.click(screen.getByRole('button', { name: 'Extract outcomes' }));

    await waitFor(() => expect(api.importSubjectPack).toHaveBeenCalledWith(expect.objectContaining({
      title: 'HSC Legal Studies',
      subject: 'legal-studies',
      extractedText: '[Page 12]\nLS11-1 examines how law regulates society',
      sourceType: 'text/plain',
    })));
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

    expect(await screen.findByRole('heading', { name: 'Business Studies is in review' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '1 decision before publishing' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Publish subject pack' })).toBeDisabled());
  });

  it('celebrates a pack only after every readiness gate passes', async () => {
    api.getSubjectPack.mockResolvedValue({
      subjectPack: {
        id: 'ready-pack', title: 'HSC Legal Studies', lifecycleStatus: 'ready', subject: 'legal-studies', outcomes: [], questions: [],
        readiness: {
          outcomes: { ready: 5, total: 5 }, questions: { ready: 5, total: 5 }, coverage: { ready: 5, total: 5, gaps: [] },
          diagnostic: { ready: 5, total: 5, available: 5 }, rubrics: { ready: 0, total: 0 }, sources: { verified: 1, total: 1, percent: 100 },
          decisions: { open: 0, resolved: 1, total: 1 }, blockers: [], canPublish: true,
        },
        reviewItems: [{ id: 'source-review', itemType: 'source_verification', title: 'Verify sources', summary: 'Sources are current.', status: 'resolved', selectedOption: 'verified', decisionOptions: [{ id: 'verified', label: 'Sources are current', description: 'Verified.' }] }],
      },
    });
    renderStudio('/curriculum-studio/ready-pack');

    expect(await screen.findByRole('heading', { name: 'Legal Studies is ready to publish' })).toBeInTheDocument();
    expect(screen.getByText(/Every readiness gate has passed/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Review complete' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publish subject pack' })).toBeEnabled();
  });

  it('guides a generic import from structure into question authoring', async () => {
    api.getSubjectPack.mockResolvedValue({
      subjectPack: {
        id: 'legal-pack',
        title: 'HSC Legal Studies',
        subject: 'legal-studies',
        syllabusVersion: 'NSW-2025',
        lifecycleStatus: 'in_review',
        sourceDocuments: [{ id: 'source-1', name: 'Legal Studies syllabus', verified: false }],
        outcomes: [{ id: 'ls-1', code: 'LS11-1', title: 'Legal system', description: 'Examines the operation of the legal system.', isAssessable: true, isActive: true }],
        questions: [],
        readiness: {
          outcomes: { ready: 0, total: 1 }, questions: { ready: 0, total: 0 }, rubrics: { ready: 0, total: 0 },
          coverage: { ready: 0, total: 1, gaps: [{ outcomeId: 'ls-1', code: 'LS11-1', title: 'Legal system' }], outcomes: [{ outcomeId: 'ls-1', code: 'LS11-1', ready: false, questionCount: 0 }] },
          diagnostic: { ready: 0, total: 5, available: 0 }, sources: { verified: 0, total: 1, percent: 0 },
          decisions: { open: 1, resolved: 0, total: 1 }, blockers: ['Add a reviewed question for 1 uncovered outcome.'], canPublish: false,
        },
        reviewItems: [{ id: 'source-review', itemType: 'source_verification', title: 'Verify extracted outcomes', summary: 'Confirm extraction.', status: 'open', decisionOptions: [] }],
      },
    });
    renderStudio('/curriculum-studio/legal-pack');

    expect(await screen.findByRole('heading', { name: 'Check what students will master.' })).toBeInTheDocument();
    expect(screen.getByText('LS11-1')).toBeInTheDocument();
    screen.getByRole('button', { name: /Continue to questions/i }).click();
    expect(await screen.findByRole('heading', { name: 'Build trustworthy evidence.' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'LS11-1 + question' })).toBeInTheDocument();
  });
});
