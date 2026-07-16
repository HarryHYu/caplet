import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import MoneyResources from '../pages/MoneyResources';
import { MONEY_RESOURCE_CATEGORIES, MONEY_RESOURCES } from '../data/moneyResources';

afterEach(() => cleanup());

describe('Money resource hub', () => {
  it('keeps the catalog at library scale', () => {
    expect(MONEY_RESOURCES.length).toBeGreaterThanOrEqual(200);
    expect(MONEY_RESOURCE_CATEGORIES.length).toBeGreaterThanOrEqual(20);
    expect(new Set(MONEY_RESOURCES.map((resource) => resource.id)).size).toBe(MONEY_RESOURCES.length);
    expect(new Set(MONEY_RESOURCES.map((resource) => resource.url)).size).toBe(MONEY_RESOURCES.length);
    expect(MONEY_RESOURCES.every((resource) => /^https:\/\//.test(resource.url))).toBe(true);
  });

  it('renders the curated catalog without duplicating spotlight links', () => {
    render(<MemoryRouter><MoneyResources /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: 'The Money resource hub.' })).toBeInTheDocument();
    expect(screen.getByText(`${MONEY_RESOURCES.length} bookmarks · ${MONEY_RESOURCE_CATEGORIES.length} categories`)).toBeInTheDocument();
    // Avoid recomputing accessible names for the entire 200+ card catalogue.
    // That made this assertion exceed the suite-wide five-second timeout.
    expect(screen.getAllByText('Morningstar Australia', { selector: 'h3' })).toHaveLength(1);
    expect(screen.getAllByText('FRED Economic Data', { selector: 'h3' })).toHaveLength(1);
    expect(screen.getByLabelText('Search and filter resource websites')).not.toHaveClass('sticky');
  });

  it('combines topic search with category filters', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><MoneyResources /></MemoryRouter>);

    await user.type(screen.getByLabelText('Search the library'), 'Morningstar');
    expect(screen.getByRole('heading', { name: 'Morningstar Australia' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'FRED Economic Data' })).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText('Search the library'));
    await user.selectOptions(screen.getByLabelText('Browse resource categories'), 'global-data');
    expect(screen.getByRole('heading', { name: 'FRED Economic Data' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Morningstar Australia' })).not.toBeInTheDocument();
  });
});
