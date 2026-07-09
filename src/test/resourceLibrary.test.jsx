import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import LibrarySubject from '../pages/LibrarySubject';
import ResourceLibrary from '../pages/ResourceLibrary';

describe('ResourceLibrary page', () => {
  it('renders stimulus sets as a first-class resource filter', () => {
    render(<ResourceLibrary />);

    expect(
      screen.getByRole('heading', { name: /Economics resources for Year 11 and Year 12/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Choose what you need to practise now/i })).toBeInTheDocument();
    expect(screen.getByText('HSC transition practice pack: Economics Stage 6 (2009)')).toBeInTheDocument();
    expect(screen.getByText('New syllabus readiness pack: Economics 11-12 (2025)')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Stimulus sets' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Resource type/i), { target: { value: 'stimulusSet' } });

    expect(screen.getByText('Scarcity and local resource allocation')).toBeInTheDocument();
    expect(screen.getByText(/Original Caplet practice stimulus/i)).toBeInTheDocument();
    expect(screen.getByText('Available budget')).toBeInTheDocument();
    expect(screen.getByText(/Show sample integrated response/i)).toBeInTheDocument();
  });

  it('lets students jump into a study route from the access panel', () => {
    render(<ResourceLibrary />);

    fireEvent.click(screen.getByRole('button', { name: /Stimulus practice/i }));

    expect(screen.getByLabelText(/Resource type/i)).toHaveValue('stimulusSet');
    expect(screen.getByText('Type: Stimulus sets')).toBeInTheDocument();
    expect(screen.getByText('Scarcity and local resource allocation')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Year 12 HSC content/i }));

    expect(screen.getByLabelText(/Year/i)).toHaveValue('12');
    expect(screen.getByRole('heading', { name: 'Economic issues in the Australian economy' })).toBeInTheDocument();
  });

  it('serves the rich economics resources from the latest library subject route', () => {
    render(
      <MemoryRouter initialEntries={['/library/economics']}>
        <Routes>
          <Route path="/library/:subject" element={<LibrarySubject />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /Economics resources for Year 11 and Year 12/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Choose what you need to practise now/i })).toBeInTheDocument();
  });
});
