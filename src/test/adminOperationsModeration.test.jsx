import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../services/api', () => ({
  default: {
    request: vi.fn(),
    getAdminModerationReports: vi.fn(),
    updateClassModerationReport: vi.fn(),
  },
}));

import api from '../services/api';
import AdminOperations from '../pages/AdminOperations';

const REPORT = {
  id: 'report-1',
  classroomId: 'class-1',
  classroom: { id: 'class-1', name: 'Year 11 Economics' },
  reason: 'bullying',
  priority: 'high',
  status: 'pending',
  overdue: true,
  contentSnapshot: 'Reported comment snapshot',
  details: 'This needs an independent review.',
  createdAt: '2026-07-12T00:00:00.000Z',
  reporter: { firstName: 'Ari', lastName: 'Student' },
  commentAuthor: { firstName: 'Tess', lastName: 'Teacher' },
  notification: {
    status: 'failed',
    attempts: 2,
    nextAttemptAt: '2026-07-13T12:05:00.000Z',
  },
};

describe('AdminOperations independent moderation queue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.request.mockImplementation((path) => {
      if (path === '/ops/admin/health') {
        return Promise.resolve({
          ready: true,
          status: 'ready',
          checkedAt: '2026-07-13T12:00:00.000Z',
          checks: {
            database: { ok: true, status: 'healthy' },
            migrations: { ok: true, status: 'current' },
            backups: { ok: true, status: 'verified' },
          },
        });
      }
      return Promise.resolve({ flags: [] });
    });
    api.getAdminModerationReports.mockResolvedValue({
      reports: [REPORT],
      guidance: {
        serviceLevel: 'Administrators should review new reports within 24 hours.',
        emergency: 'If anyone is in immediate danger, contact Triple Zero (000) now.',
      },
    });
    api.updateClassModerationReport.mockResolvedValue({ report: { id: REPORT.id, status: 'actioned' } });
  });

  it('shows severity, overdue and failed-delivery state and records an admin action', async () => {
    render(<MemoryRouter><AdminOperations /></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: 'Independent safety review' })).toBeInTheDocument();
    expect(screen.getByText('High severity')).toBeInTheDocument();
    expect(screen.getByText('Overdue · 24h SLA')).toBeInTheDocument();
    expect(screen.getByText('Alert retry queued')).toBeInTheDocument();
    expect(screen.getByText(/Triple Zero \(000\)/)).toBeInTheDocument();
    expect(screen.getByText('Reported comment snapshot')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Action taken' }));
    await waitFor(() => expect(api.updateClassModerationReport).toHaveBeenCalledWith(
      'class-1',
      'report-1',
      { status: 'actioned' },
    ));
    expect(await screen.findByText('The moderation decision was recorded in the audit history.')).toBeInTheDocument();
    expect(screen.queryByText('Reported comment snapshot')).not.toBeInTheDocument();
  });
});
