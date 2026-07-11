import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import LibrarySubject from '../pages/LibrarySubject';
import ResourceLibrary from '../pages/ResourceLibrary';

function renderEconomics(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/library/economics/:section/:focusId" element={<ResourceLibrary />} />
        <Route path="/library/economics/:section" element={<ResourceLibrary />} />
        <Route path="/library/:subject" element={<LibrarySubject />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ResourceLibrary page', () => {
  it('gives students focused destinations from the Economics overview', () => {
    renderEconomics('/library/economics');

    expect(screen.getByRole('heading', { name: /Economics, organised around your next move/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Year 11 Foundations/i })).toHaveAttribute('href', '/library/economics/year-11');
    expect(screen.getByRole('link', { name: /Year 12 HSC course/i })).toHaveAttribute('href', '/library/economics/year-12');
    expect(screen.getByRole('link', { name: /Timed practice Exam packs/i })).toHaveAttribute('href', '/library/economics/exam-practice');
  });

  it('keeps Year 11 practice on its own page and retains resource filters', () => {
    renderEconomics('/library/economics/year-11');

    expect(screen.getByRole('heading', { name: /Build the economic toolkit/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Year/i)).toHaveValue('11');
    expect(screen.getByRole('option', { name: 'Stimulus sets' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Resource type/i), { target: { value: 'stimulusSet' } });

    expect(screen.getByText('Scarcity and local resource allocation')).toBeInTheDocument();
    expect(screen.getByText(/Original Caplet practice stimulus/i)).toBeInTheDocument();
  });

  it('serves the Economics overview from the latest library subject route', () => {
    renderEconomics('/library/economics');
    expect(screen.getByRole('navigation', { name: 'Economics library' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Assessment guide' })).toHaveAttribute('href', '/library/economics/assessment');
  });
});
