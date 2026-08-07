import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import AssessmentSchedule from '../pages/AssessmentSchedule';

describe('AssessmentSchedule', () => {
  beforeEach(() => localStorage.clear());

  it('shows every dated task from the two Year 11 source grids', () => {
    render(<AssessmentSchedule />);

    expect(screen.getByRole('heading', { name: 'Upcoming assessment tasks' })).toBeInTheDocument();
    expect(screen.getByText('Upcoming tasks')).toBeInTheDocument();
    expect(screen.getByText('46')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Music 1 & Music 2' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'English Studies' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { name: 'English Advanced' }).length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'Mathematics Extension 1' })).toBeInTheDocument();
    expect(screen.queryByText('Use this as a planning view.')).not.toBeInTheDocument();
  });

  it('filters the timeline by subject', async () => {
    const user = userEvent.setup();
    render(<AssessmentSchedule />);

    await user.selectOptions(screen.getByLabelText('Subject'), 'Economics');

    expect(screen.getByRole('heading', { name: 'Economics' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Music 1 & Music 2' })).not.toBeInTheDocument();
    expect(screen.getByText('Showing 1 of 46 tasks.')).toBeInTheDocument();
  });

  it('shows only assessment tasks for the subjects selected in the library', () => {
    localStorage.setItem('caplet:my-subjects', JSON.stringify([
      'Mathematics Advanced', 'Mathematics Extension 1', 'English Extension 1',
      'English Advanced', 'Chemistry', 'Physics',
    ]));

    render(<AssessmentSchedule />);

    expect(screen.getByText('Showing 6 of 6 tasks.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Mathematics Advanced' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'English Extension 1' })).toBeInTheDocument();
    expect(screen.getByText(/8\.55am–9\.40am.*40 minutes.*Great Hall/)).toBeInTheDocument();
    expect(screen.getByText(/8\.50am–11\.00am.*2 hours.*KCC Hall, KCC103, KCC104/)).toBeInTheDocument();
    expect(screen.getAllByText('Official 2026 yearly examinations timetable').length).toBe(6);
    expect(screen.queryByRole('heading', { name: 'Economics' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Music 1 & Music 2' })).not.toBeInTheDocument();
  });

  it('lets a student add, edit and remove a personal assessment', async () => {
    localStorage.setItem('caplet:my-subjects', JSON.stringify(['Society and Culture', 'Society and Culture Trial']));
    const user = userEvent.setup();
    render(<AssessmentSchedule />);

    await user.click(screen.getByRole('button', { name: 'Add assessment' }));
    await user.type(screen.getByLabelText('Subject or task name'), 'Society and Culture');
    await user.type(screen.getByLabelText('Date'), '2026-10-20');
    await user.clear(screen.getByLabelText('Task type'));
    await user.type(screen.getByLabelText('Task type'), 'Trial exam');
    await user.click(screen.getByRole('button', { name: 'Save assessment' }));

    expect(screen.getAllByRole('heading', { name: 'Society and Culture' })).toHaveLength(2);
    expect(screen.getByText('Showing 1 of 1 tasks.')).toBeInTheDocument();
    expect(screen.getAllByText('Personalised').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Edit Society and Culture' }));
    await user.clear(screen.getByLabelText('Subject or task name'));
    await user.type(screen.getByLabelText('Subject or task name'), 'Society and Culture Trial');
    await user.click(screen.getByRole('button', { name: 'Save assessment' }));
    expect(screen.getAllByRole('heading', { name: 'Society and Culture Trial' })).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: 'Remove Society and Culture Trial' }));
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    expect(screen.queryByRole('heading', { name: 'Society and Culture Trial' })).not.toBeInTheDocument();
  });

  it('marks official task edits as personal and can hide them without changing defaults', async () => {
    localStorage.setItem('caplet:my-subjects', JSON.stringify(['Economics']));
    const user = userEvent.setup();
    render(<AssessmentSchedule />);

    await user.click(screen.getByRole('button', { name: 'Edit Economics' }));
    await user.clear(screen.getByLabelText('Notes'));
    await user.type(screen.getByLabelText('Notes'), 'Bring the calculator and revise fiscal policy.');
    await user.click(screen.getByRole('button', { name: 'Save assessment' }));

    const storedAfterEdit = JSON.parse(localStorage.getItem('caplet:assessment-customisations'));
    expect(storedAfterEdit.overrides['economics-yearly']).toMatchObject({
      detail: 'Bring the calculator and revise fiscal policy.',
      source: 'Personalised',
    });

    await user.click(screen.getByRole('button', { name: 'Remove Economics' }));
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    expect(screen.queryByRole('heading', { name: 'Economics' })).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('caplet:assessment-customisations')).hiddenIds).toContain('economics-yearly');
  });
});
