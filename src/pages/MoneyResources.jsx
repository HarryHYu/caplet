import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AcademicCapIcon,
  ArrowLeftIcon,
  ArrowTopRightOnSquareIcon,
  ArrowsRightLeftIcon,
  BanknotesIcon,
  BookmarkSquareIcon,
  BoltIcon,
  BriefcaseIcon,
  BuildingOffice2Icon,
  BuildingLibraryIcon,
  CalculatorIcon,
  ChartBarSquareIcon,
  ChevronDownIcon,
  CreditCardIcon,
  DocumentChartBarIcon,
  GlobeAltIcon,
  HomeModernIcon,
  LightBulbIcon,
  MagnifyingGlassIcon,
  PresentationChartLineIcon,
  RocketLaunchIcon,
  ScaleIcon,
  ShieldCheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { MONEY_RESOURCE_CATEGORIES, MONEY_RESOURCES } from '../data/moneyResources';

const categoryIcons = {
  'australian-data': ChartBarSquareIcon,
  'global-data': GlobeAltIcon,
  'markets-research': PresentationChartLineIcon,
  'investing-super': BanknotesIcon,
  'tax-work-support': ScaleIcon,
  'budgeting-everyday': CalculatorIcon,
  'explainers-literacy': LightBulbIcon,
  'starting-business': BuildingOffice2Icon,
  'banking-credit-insurance': BuildingLibraryIcon,
  'work-income-careers': BriefcaseIcon,
  'consumer-protection': ShieldCheckIcon,
  'housing-property': HomeModernIcon,
  'business-tools-grants': RocketLaunchIcon,
  'academic-economic-research': AcademicCapIcon,
  'economics-learning': LightBulbIcon,
  'energy-environment-economics': BoltIcon,
  'trade-development': ArrowsRightLeftIcon,
  'public-policy-budgets': DocumentChartBarIcon,
  'financial-calculators-tools': CalculatorIcon,
  'commodities-agriculture': ChartBarSquareIcon,
  'digital-money-fintech': CreditCardIcon,
  'global-markets-regulators': GlobeAltIcon,
};

const categoryTones = {
  'australian-data': 'bg-[color:var(--block-blue)] text-accent',
  'global-data': 'bg-[color:var(--block-green)] text-accent',
  'markets-research': 'bg-[color:var(--block-amber)] text-text-primary',
  'investing-super': 'bg-[color:var(--block-coral)] text-text-primary',
  'tax-work-support': 'bg-[color:var(--block-blue)] text-accent',
  'budgeting-everyday': 'bg-[color:var(--block-cream)] text-accent',
  'explainers-literacy': 'bg-[color:var(--block-green)] text-accent',
  'starting-business': 'bg-[color:var(--block-amber)] text-text-primary',
};

function matchesResource(resource, query) {
  if (!query) return true;
  const searchable = [
    resource.name,
    resource.domain,
    resource.kind,
    resource.description,
    resource.categoryLabel,
    ...(resource.tags || []),
  ].join(' ').toLowerCase();
  return searchable.includes(query);
}

function ResourceCard({ resource }) {
  const Icon = categoryIcons[resource.categoryId] || BookmarkSquareIcon;
  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noreferrer"
      className="group flex min-w-0 h-full flex-col rounded-3xl border border-line-soft bg-surface-raised p-5 shadow-[0_24px_50px_-42px_rgba(20,20,18,0.42)] transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-accent hover:shadow-[0_26px_50px_-34px_rgba(19,81,170,0.45)]"
    >
      <div className="flex items-start justify-between gap-4">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${categoryTones[resource.categoryId] || 'bg-surface-soft text-accent'}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <ArrowTopRightOnSquareIcon className="h-5 w-5 shrink-0 text-text-dim transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent" aria-hidden="true" />
      </div>
      <h3 className="mt-5 break-words font-display text-xl font-extrabold tracking-tight text-text-primary">{resource.name}</h3>
      <p className="mt-3 flex-1 text-sm font-medium leading-relaxed text-text-muted">{resource.description}</p>
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-surface-soft px-2.5 py-1 text-[11px] font-bold text-text-dim">{resource.domain}</span>
        <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-bold text-accent">{resource.kind}</span>
      </div>
    </a>
  );
}

export default function MoneyResources() {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const normalizedQuery = query.trim().toLowerCase();
  const isFiltering = Boolean(normalizedQuery) || selectedCategory !== 'all';

  const filteredResources = useMemo(() => MONEY_RESOURCES.filter((resource) => (
    (selectedCategory === 'all' || resource.categoryId === selectedCategory)
      && matchesResource(resource, normalizedQuery)
  )), [normalizedQuery, selectedCategory]);

  const featuredResources = MONEY_RESOURCES.filter((resource) => resource.featured).slice(0, 4);
  const featuredIds = new Set(featuredResources.map((resource) => resource.id));
  const displayedResources = isFiltering
    ? filteredResources
    : filteredResources.filter((resource) => !featuredIds.has(resource.id));
  const visibleCategories = MONEY_RESOURCE_CATEGORIES.filter((category) => (
    displayedResources.some((resource) => resource.categoryId === category.id)
  ));

  const clearFilters = () => {
    setQuery('');
    setSelectedCategory('all');
  };

  return (
    <div className="min-h-screen bg-surface-body pb-32 pt-28 selection:bg-accent selection:text-white md:pt-32 lg:pb-20">
      <div className="container-custom">
        <Link to="/money" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-text-muted transition-colors hover:text-accent">
          <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
          Money overview
        </Link>

        <header className="mt-8 max-w-4xl">
          <span className="font-hand text-xl text-accent">Money · research, clearly sorted</span>
          <div className="mt-3 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="font-display text-5xl font-extrabold tracking-tight text-text-primary md:text-7xl">The Money resource hub.</h1>
              <p className="mt-5 max-w-2xl text-lg font-medium leading-relaxed text-text-muted">A growing shelf of useful websites for data, markets, investing, work and everyday money. Search one place instead of starting from scratch.</p>
            </div>
            <div className="flex shrink-0 items-center gap-2 rounded-2xl bg-surface-raised px-4 py-3 text-sm font-bold text-text-primary shadow-[0_18px_42px_-34px_rgba(20,20,18,0.4)]">
              <BookmarkSquareIcon className="h-5 w-5 text-accent" aria-hidden="true" />
              <span>{MONEY_RESOURCES.length} bookmarks · {MONEY_RESOURCE_CATEGORIES.length} categories</span>
            </div>
          </div>
        </header>

        {!isFiltering ? <section className="mt-10 rounded-3xl bg-[color:var(--block-blue)] p-6 md:p-8" aria-labelledby="resource-hub-start-title">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <span className="section-kicker">Start here</span>
              <h2 id="resource-hub-start-title" className="mt-1 font-display text-2xl font-extrabold tracking-tight text-text-primary">Four reliable places to begin</h2>
            </div>
            <p className="text-sm font-medium text-text-muted">Curated for student research and first questions.</p>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featuredResources.map((resource) => <ResourceCard key={resource.id} resource={resource} />)}
          </div>
        </section> : null}

        <section className="mt-10 rounded-3xl border border-line-soft bg-surface-body p-4 md:p-5" aria-label="Search and filter resource websites">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.42fr)] lg:items-end">
            <div className="min-w-0">
              <label htmlFor="money-resource-search" className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-text-dim">Search the library</label>
              <div className="relative">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-dim" aria-hidden="true" />
                <input
                  id="money-resource-search"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search sites, topics or keywords…"
                  className="w-full rounded-2xl border border-line-soft bg-surface-raised py-3.5 pl-12 pr-12 text-sm font-semibold text-text-primary outline-none transition-colors placeholder:text-text-dim focus:border-accent focus:ring-2 focus:ring-accent-soft"
                />
                {query ? (
                  <button type="button" aria-label="Clear resource search" onClick={() => setQuery('')} className="absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full text-text-dim hover:text-text-primary">
                    <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            </div>
            <div className="min-w-0">
              <label htmlFor="money-resource-category" className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-text-dim">Browse by category</label>
              <div className="relative">
                <select
                  id="money-resource-category"
                  aria-label="Browse resource categories"
                  value={selectedCategory}
                  onChange={(event) => setSelectedCategory(event.target.value)}
                  className="min-h-12 w-full appearance-none rounded-2xl border border-line-soft bg-surface-raised px-4 pr-11 text-sm font-bold text-text-primary outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-soft"
                >
                  <option value="all">All categories · {MONEY_RESOURCES.length} resources</option>
                  {MONEY_RESOURCE_CATEGORIES.map((category) => <option key={category.id} value={category.id}>{category.label} · {category.resources.length}</option>)}
                </select>
                <ChevronDownIcon className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-dim" aria-hidden="true" />
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line-soft pt-3">
            <p className="text-sm font-bold text-text-muted" aria-live="polite">{isFiltering ? `${filteredResources.length} matching resource${filteredResources.length === 1 ? '' : 's'}` : `Showing all ${MONEY_RESOURCES.length} resources`}</p>
            {isFiltering ? <button type="button" onClick={clearFilters} className="inline-flex min-h-10 items-center rounded-full bg-accent-soft px-4 text-sm font-extrabold text-accent transition-colors hover:bg-accent hover:text-white">Clear filters</button> : <p className="text-xs font-semibold text-text-dim">Open any card to visit the source website.</p>}
          </div>
        </section>

        <div className="mt-10 space-y-12">
          {visibleCategories.length > 0 ? visibleCategories.map((category) => {
            const resources = displayedResources.filter((resource) => resource.categoryId === category.id);
            return (
              <section key={category.id} id={category.id} className="scroll-mt-36" aria-labelledby={`${category.id}-title`}>
                <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-accent">{resources.length} {isFiltering ? 'bookmarks' : 'more bookmarks'} in this shelf</p>
                    <h2 id={`${category.id}-title`} className="mt-2 font-display text-3xl font-extrabold tracking-tight text-text-primary">{category.label}</h2>
                    <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-text-muted">{category.description}</p>
                  </div>
                  {isFiltering ? <span className="text-sm font-bold text-text-muted">{resources.length} shown</span> : null}
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {resources.map((resource) => <ResourceCard key={resource.id} resource={resource} />)}
                </div>
              </section>
            );
          }) : (
            <section className="rounded-3xl bg-[color:var(--block-cream)] px-6 py-20 text-center" aria-live="polite">
              <BookmarkSquareIcon className="mx-auto h-10 w-10 text-text-dim" aria-hidden="true" />
              <h2 className="mt-5 font-display text-2xl font-extrabold tracking-tight text-text-primary">No resource matches that search.</h2>
              <p className="mx-auto mt-3 max-w-md text-sm font-medium leading-relaxed text-text-muted">Try a broader topic, a website name or a different category.</p>
              <button type="button" onClick={clearFilters} className="mt-6 text-sm font-extrabold text-accent underline underline-offset-4">Clear filters</button>
            </section>
          )}
        </div>

        <aside className="mt-12 rounded-3xl border border-line-soft bg-surface-raised p-6 md:p-8" aria-label="Resource hub note">
          <div className="flex items-start gap-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent"><BookmarkSquareIcon className="h-5 w-5" aria-hidden="true" /></span>
            <div>
              <h2 className="font-display text-xl font-extrabold tracking-tight text-text-primary">Use the source, not just the headline.</h2>
              <p className="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-text-muted">These links leave Caplet and are provided as a starting point for learning. Check the publisher, date, methodology and context before using a number in an assignment or decision.</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
