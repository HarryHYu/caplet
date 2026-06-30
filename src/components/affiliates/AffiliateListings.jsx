import { useEffect, useState } from 'react';
import api from '../../services/api';

/**
 * <AffiliateListings type maxBudget />
 *
 * Contextual "listings within budget" shown after a user computes a result in a
 * calculator tool (property for the Mortgage tool, cars for Loan Repayment).
 *
 * Data comes from api.getAffiliateListings(type, maxBudget), which falls back to
 * a small bundled sample dataset when the backend endpoint is missing/errors —
 * so this renders and filters by budget even with no backend.
 *
 * Results are clearly labelled "Sponsored / external" and carry an
 * educational-only disclaimer.
 *
 * Props:
 *   type      - 'realestate' | 'car' (API CONTRACT enum)
 *   maxBudget - number (AUD). Listings are filtered to <= this value.
 */

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(value);

const HEADINGS = {
  realestate: 'Properties within your budget',
  car: 'Cars within your budget',
};

function SkeletonGrid() {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-line-soft border border-line-soft"
      aria-hidden="true"
    >
      {[0, 1, 2].map((i) => (
        <div key={i} className="bg-surface-body p-6 flex flex-col gap-4 animate-pulse">
          <div className="aspect-[4/3] bg-surface-soft" />
          <div className="h-3 w-1/3 bg-surface-soft" />
          <div className="h-4 w-3/4 bg-surface-soft" />
          <div className="h-5 w-1/2 bg-surface-soft" />
        </div>
      ))}
    </div>
  );
}

function ListingCard({ listing, type }) {
  const { title, price, image, url, source } = listing;
  const priceNum = Number(price);
  // Fire-and-forget click event (per API CONTRACT). Never blocks navigation.
  const onView = () => {
    api.logEvent({
      type: 'listing_clicked',
      entityType: 'affiliate',
      entityId: listing.id ?? url,
      metadata: { listingType: type, source, price: priceNum },
    });
  };
  return (
    <article className="bg-surface-body p-6 flex flex-col gap-4">
      <div className="aspect-[4/3] bg-surface-soft overflow-hidden border border-line-soft">
        {image && (
          <img
            src={image}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        )}
      </div>
      <div className="flex-1">
        {source && (
          <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-text-dim mb-2">{source}</p>
        )}
        <p className="text-sm font-bold text-text-primary leading-snug">{title}</p>
      </div>
      <div className="flex items-end justify-between gap-3">
        {Number.isFinite(priceNum) && (
          <p className="text-lg font-black tracking-tight text-accent">{formatCurrency(priceNum)}</p>
        )}
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer sponsored"
            onClick={onView}
            className="shrink-0 text-[10px] font-bold uppercase tracking-[0.3em] text-text-primary border-b border-accent pb-1 hover:text-accent transition-colors"
          >
            View &rarr;
          </a>
        )}
      </div>
    </article>
  );
}

export default function AffiliateListings({ type = 'realestate', maxBudget }) {
  const [listings, setListings] = useState(null); // null = loading

  useEffect(() => {
    let active = true;
    setListings(null);
    // api.getAffiliateListings never rejects (falls back to sample data),
    // but guard anyway so a thrown error can never break the host tool.
    Promise.resolve(api.getAffiliateListings(type, maxBudget))
      .then((data) => {
        if (active) setListings(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (active) setListings([]);
      });
    return () => { active = false; };
  }, [type, maxBudget]);

  const heading = HEADINGS[type] || 'Listings within your budget';
  const loading = listings === null;
  const isEmpty = !loading && listings.length === 0;
  const budgetNum = Number(maxBudget);

  return (
    <section
      aria-label={heading}
      className="mt-px bg-surface-raised border border-line-soft border-t-0 p-12 lg:p-20"
    >
      <div className="flex items-center justify-between gap-4 mb-8">
        <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted">{heading}</h2>
        <span className="shrink-0 text-[9px] font-bold uppercase tracking-[0.25em] text-text-dim border border-line-soft px-3 py-1 rounded-full">
          Sponsored / external
        </span>
      </div>

      {loading && <SkeletonGrid />}

      {isEmpty && (
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-text-dim">
          No matching listings within{' '}
          {Number.isFinite(budgetNum) && budgetNum > 0 ? formatCurrency(budgetNum) : 'your budget'} right now.
        </p>
      )}

      {!loading && !isEmpty && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-line-soft border border-line-soft">
          {listings.map((listing, i) => (
            <ListingCard key={listing.id ?? listing.url ?? `${listing.title}-${i}`} listing={listing} type={type} />
          ))}
        </div>
      )}

      <p className="mt-8 text-[10px] font-serif italic text-text-dim leading-relaxed max-w-2xl">
        Sponsored listings from external providers, shown for educational purposes only. Caplet does
        not endorse these offers and is not responsible for their content, and may earn a commission.
        This is not financial advice — always do your own research before making a decision.
      </p>
    </section>
  );
}
