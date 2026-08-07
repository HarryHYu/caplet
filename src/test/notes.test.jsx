import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Notes from '../pages/Notes';

const renderNotes = (path = '/notes') => render(<MemoryRouter initialEntries={[path]}><Notes /></MemoryRouter>);

describe('Notes', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('caplet:my-subjects', JSON.stringify(['Economics', 'Mathematics Advanced']));
  });

  it('stores native notes under the selected dashboard subject', async () => {
    const user = userEvent.setup();
    renderNotes('/notes?subject=Economics');

    await user.click(screen.getByRole('button', { name: 'New note' }));
    await user.type(screen.getByLabelText('Title'), 'Fiscal policy');
    await user.type(screen.getByLabelText('Note'), 'Automatic stabilisers reduce swings in demand.');
    await user.click(screen.getByRole('button', { name: 'Save note' }));

    expect(screen.getByRole('heading', { name: 'Fiscal policy' })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('caplet:subject-notes')).notes[0]).toMatchObject({ subject: 'Economics', title: 'Fiscal policy' });
  });

  it('validates and saves Google Docs links', async () => {
    const user = userEvent.setup();
    renderNotes();

    await user.click(screen.getByRole('button', { name: 'Add Google Doc' }));
    await user.type(screen.getByLabelText('Name'), 'Class notes');
    await user.type(screen.getByLabelText('Google Docs link'), 'https://example.com/not-a-doc');
    await user.click(screen.getByRole('button', { name: 'Save link' }));
    expect(screen.getByRole('alert')).toHaveTextContent('valid Google Docs');

    await user.clear(screen.getByLabelText('Google Docs link'));
    await user.type(screen.getByLabelText('Google Docs link'), 'https://docs.google.com/document/d/example/edit');
    await user.click(screen.getByRole('button', { name: 'Save link' }));
    expect(screen.getByRole('link', { name: /Open/ })).toHaveAttribute('href', 'https://docs.google.com/document/d/example/edit');
  });

  it('stores links and resources under the selected subject', async () => {
    const user = userEvent.setup();
    renderNotes('/notes?subject=Economics');

    await user.click(screen.getByRole('button', { name: 'Add link' }));
    await user.type(screen.getByLabelText('Name'), 'RBA explainer');
    await user.type(screen.getByLabelText('Link'), 'https://www.rba.gov.au/education/resources/explainers/');
    await user.type(screen.getByLabelText(/Description/), 'Monetary policy reference');
    await user.click(screen.getByRole('button', { name: 'Save resource' }));

    expect(screen.getByRole('heading', { name: 'RBA explainer' })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('caplet:subject-notes')).resources[0]).toMatchObject({
      subject: 'Economics',
      title: 'RBA explainer',
      description: 'Monetary policy reference',
    });
  });
});
