import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('../services/api', () => ({
  default: { request: vi.fn() },
}));

import api from '../services/api';
import TeacherClassLearning from '../pages/TeacherClassLearning';
import TeacherEvidenceOverride from '../pages/TeacherEvidenceOverride';
import TeacherOnboarding from '../pages/TeacherOnboarding';

const CLASS_ID = '30000000-0000-4000-8000-000000000001';
const STUDENT_ONE = '20000000-0000-4000-8000-000000000001';
const STUDENT_TWO = '20000000-0000-4000-8000-000000000002';
const OUTCOME_ONE = '40000000-0000-4000-8000-000000000001';
const OUTCOME_TWO = '40000000-0000-4000-8000-000000000002';
const EVIDENCE_ID = '70000000-0000-4000-8000-000000000001';

const ANALYTICS = {
  classroom: { id: CLASS_ID, name: 'Year 12 Economics' },
  analytics: {
    threshold: 0.6,
    summary: {
      studentCount: 2,
      outcomeCount: 2,
      evidenceCount: 9,
      studentsNeedingIntervention: 1,
    },
    heatmap: {
      students: [
        { id: STUDENT_ONE, name: 'Ada Lovelace', email: 'ada@example.test' },
        { id: STUDENT_TWO, name: 'Charles Babbage', email: 'charles@example.test' },
      ],
      outcomes: [
        { id: OUTCOME_ONE, code: 'E12.1', title: 'Market operations' },
        { id: OUTCOME_TWO, code: 'E12.2', title: 'Economic policy' },
      ],
      cells: [
        { studentId: STUDENT_ONE, outcomeId: OUTCOME_ONE, probability: 0.35, evidenceCount: 2, status: 'needs_support' },
        { studentId: STUDENT_ONE, outcomeId: OUTCOME_TWO, probability: 0.72, evidenceCount: 3, status: 'developing' },
        { studentId: STUDENT_TWO, outcomeId: OUTCOME_ONE, probability: 0.86, evidenceCount: 2, status: 'secure' },
        { studentId: STUDENT_TWO, outcomeId: OUTCOME_TWO, probability: 0.8, evidenceCount: 2, status: 'secure' },
      ],
    },
    individualProfiles: [
      {
        student: { id: STUDENT_ONE, name: 'Ada Lovelace' },
        averageProbability: 0.535,
        evidenceCount: 5,
        outcomes: [
          { studentId: STUDENT_ONE, outcomeId: OUTCOME_ONE, probability: 0.35, evidenceCount: 2, outcome: { id: OUTCOME_ONE, code: 'E12.1', title: 'Market operations' } },
        ],
      },
    ],
    commonMisconceptions: [
      { code: 'movement-vs-shift', count: 3, studentCount: 2, outcomeIds: [OUTCOME_ONE] },
    ],
    studentsNeedingIntervention: [
      {
        student: { id: STUDENT_ONE, name: 'Ada Lovelace' },
        averageProbability: 0.535,
        weakOutcomeCount: 1,
        dueOutcomeCount: 0,
        priority: 'medium',
        reasons: ['low_mastery'],
      },
    ],
    recommendedGroups: [
      {
        id: `outcome:${OUTCOME_ONE}`,
        outcome: { id: OUTCOME_ONE, code: 'E12.1', title: 'Market operations' },
        studentIds: [STUDENT_ONE],
        studentCount: 1,
        averageProbability: 0.35,
        reason: 'shared_weak_outcome',
        recommendedMode: 'remediation',
      },
    ],
  },
};

function renderClassPage() {
  return render(
    <MemoryRouter initialEntries={[`/classes/${CLASS_ID}/learning`]}>
      <Routes>
        <Route path="/classes/:classId/learning" element={<TeacherClassLearning />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('teacher product frontend', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits a school affiliation and shows pending teacher verification', async () => {
    api.request
      .mockResolvedValueOnce({ status: 'not_requested', profile: null, teacherAccess: false })
      .mockResolvedValueOnce({
        status: 'pending',
        profile: {
          id: 'profile-1',
          schoolAffiliation: {
            name: 'Sydney Secondary College',
            domain: 'school.nsw.edu.au',
            staffEmail: 'teacher@school.nsw.edu.au',
            positionTitle: 'Economics Teacher',
            jurisdiction: 'NSW',
          },
        },
      });

    render(<MemoryRouter><TeacherOnboarding /></MemoryRouter>);

    fireEvent.change(await screen.findByLabelText('School name'), { target: { value: 'Sydney Secondary College' } });
    fireEvent.change(screen.getByLabelText('School email'), { target: { value: 'teacher@school.nsw.edu.au' } });
    fireEvent.change(screen.getByLabelText(/School website domain/i), { target: { value: 'school.nsw.edu.au' } });
    fireEvent.change(screen.getByLabelText(/Position title/i), { target: { value: 'Economics Teacher' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit for review' }));

    await waitFor(() => expect(api.request).toHaveBeenLastCalledWith(
      '/teacher-learning/onboarding/request',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          schoolName: 'Sydney Secondary College',
          schoolDomain: 'school.nsw.edu.au',
          staffEmail: 'teacher@school.nsw.edu.au',
          positionTitle: 'Economics Teacher',
          jurisdiction: 'NSW',
        }),
      }),
    ));
    expect(await screen.findByRole('heading', { name: 'Verification is in review.' })).toBeInTheDocument();
    expect(screen.getByText('Your school affiliation has been submitted for review.')).toBeInTheDocument();
  });

  it('renders accessible class insights and opens a student mastery profile', async () => {
    api.request.mockResolvedValue(ANALYTICS);
    renderClassPage();

    expect(await screen.findByRole('heading', { name: 'Class learning.' })).toBeInTheDocument();
    expect(api.request).toHaveBeenCalledWith(`/teacher-learning/classes/${CLASS_ID}/analytics?subject=economics&threshold=0.6`);
    const table = screen.getByRole('table', { name: 'Mastery probability for each student and curriculum outcome' });
    expect(within(table).getByLabelText('Ada Lovelace, E12.1: 35% mastery, 2 attempts')).toBeInTheDocument();
    expect(screen.getByText('movement-vs-shift')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Intervention queue' })).toBeInTheDocument();

    fireEvent.click(within(table).getByRole('button', { name: 'Ada Lovelace' }));
    const profile = screen.getByRole('region', { name: 'Ada Lovelace' });
    await waitFor(() => expect(profile).toHaveFocus());
    expect(screen.getByText('35% mastery · 2 attempts')).toBeInTheDocument();

    fireEvent.click(within(profile).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(within(table).getByRole('button', { name: 'Ada Lovelace' })).toHaveFocus());
  });

  it('turns a suggested remediation group into a targeted adaptive assignment', async () => {
    api.request.mockImplementation((endpoint, options) => {
      if (endpoint.includes('/analytics?')) return Promise.resolve(ANALYTICS);
      if (endpoint.endsWith('/assignments') && options?.method === 'POST') {
        return Promise.resolve({
          assignment: { id: 'assignment-1', title: 'E12.1 remediation' },
          learningConfig: { outcomeIds: [OUTCOME_ONE], targetStudentIds: [STUDENT_ONE] },
        });
      }
      return Promise.reject(new Error(`Unexpected request: ${endpoint}`));
    });
    renderClassPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Create remediation assignment' }));
    const title = screen.getByLabelText('Assignment title');
    await waitFor(() => expect(title).toHaveValue('E12.1 remediation'));
    expect(screen.getByLabelText('Ada Lovelace')).toBeChecked();
    expect(screen.getByLabelText('Charles Babbage')).not.toBeChecked();
    expect(screen.getByLabelText(/Market operations/i)).toBeChecked();

    fireEvent.click(screen.getByRole('button', { name: 'Create assignment' }));
    await waitFor(() => {
      const call = api.request.mock.calls.find(([endpoint, options]) => endpoint.endsWith('/assignments') && options?.method === 'POST');
      expect(call).toBeTruthy();
      expect(JSON.parse(call[1].body)).toEqual(expect.objectContaining({
        title: 'E12.1 remediation',
        mode: 'remediation',
        outcomeIds: [OUTCOME_ONE],
        studentIds: [STUDENT_ONE],
        questionSelection: expect.objectContaining({ strategy: 'balanced', count: 5 }),
      }));
    });
    expect(await screen.findByText(/is now available in each selected student’s Teacher assigned practice/i)).toBeInTheDocument();
  });

  it('submits an audited human evidence override and reports the mastery refresh', async () => {
    api.request.mockResolvedValue({
      evidence: { id: 'revision-1', revisionOfId: EVIDENCE_ID, score: 8, maxScore: 10, markingMethod: 'human' },
      masteryRefresh: 'updated',
      mastery: { probability: 0.76 },
    });
    const entry = {
      pathname: `/classes/${CLASS_ID}/learning/students/${STUDENT_ONE}/evidence/${EVIDENCE_ID}`,
      state: {
        student: { id: STUDENT_ONE, name: 'Ada Lovelace' },
        evidence: {
          id: EVIDENCE_ID,
          score: 4,
          maxScore: 10,
          feedback: { summary: 'Initial AI feedback' },
          misconceptionCodes: ['old-code'],
          question: { prompt: 'Explain how monetary policy affects demand.' },
        },
      },
    };
    render(
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/classes/:classId/learning/students/:studentId/evidence/:evidenceId" element={<TeacherEvidenceOverride />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByDisplayValue('Initial AI feedback')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Correct mark'), { target: { value: '8' } });
    fireEvent.change(screen.getByLabelText('Corrected feedback'), { target: { value: 'Clear causal chain and accurate terminology.' } });
    fireEvent.change(screen.getByLabelText('Audit reason'), { target: { value: 'The rubric awards four additional analysis marks.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save teacher override' }));

    await waitFor(() => expect(api.request).toHaveBeenCalledWith(
      `/teacher-learning/classes/${CLASS_ID}/students/${STUDENT_ONE}/evidence/${EVIDENCE_ID}/override`,
      expect.objectContaining({ method: 'POST' }),
    ));
    const payload = JSON.parse(api.request.mock.calls[0][1].body);
    expect(payload).toEqual(expect.objectContaining({
      score: 8,
      maxScore: 10,
      reason: 'The rubric awards four additional analysis marks.',
      feedback: 'Clear causal chain and accurate terminology.',
      idempotencyKey: expect.stringMatching(/^teacher-ui-/),
    }));
    expect(await screen.findByText('The corrected evidence and mastery profile are saved.')).toBeInTheDocument();
  });
});
