import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock the API singleton — the list view calls getEssays and getDueReviewItems
// (for the per-essay "N due" badges) in parallel on mount.
vi.mock('../services/api', () => ({
  default: {
    getEssays: vi.fn().mockResolvedValue({ essays: [] }),
    getDueReviewItems: vi.fn().mockResolvedValue({ items: [] }),
    getProxiedImageSrc: (u) => u,
  },
}));

import EssayMemoriser from '../pages/EssayMemoriser';

describe('EssayMemoriser', () => {
  it('renders the page heading, new-essay form and empty state after loading', async () => {
    render(<EssayMemoriser />);
    expect(await screen.findByText(/Learn it by heart/i)).toBeInTheDocument();
    expect(screen.getByText(/New essay/i)).toBeInTheDocument();
    expect(await screen.findByText(/No essays yet/i)).toBeInTheDocument();
    // PDF upload affordance is present (reuses the existing extractor)
    expect(screen.getByText(/Upload PDF/i)).toBeInTheDocument();
  });
});
