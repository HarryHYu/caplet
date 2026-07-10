import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TrustCenter from '../pages/TrustCenter';

describe('TrustCenter', () => {
  it('covers the public trust, safety, AI, finance, data rights and school responsibilities', () => {
    render(<MemoryRouter><TrustCenter /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: /Trust is part of.*the product/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Privacy overview/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Student data handling/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /AI limitations and human review/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Financial education, not personal advice/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Account deletion and data export/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Security basics/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /School and teacher responsibilities/i })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'contact@caplet.org' })[0]).toHaveAttribute('href', expect.stringContaining('mailto:'));
  });
});
