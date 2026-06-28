/**
 * Bundled fallback data for <AffiliateListings />.
 *
 * Used when GET /api/affiliates/listings is unavailable (e.g. before the
 * backend ships) or returns nothing, so the feature demos immediately. This is
 * clearly-labelled sample/sponsored demo data — not real offers.
 *
 * `type` (matches the API CONTRACT enum):
 *   'realestate' — for the Mortgage tool (budget = loan amount)
 *   'car'        — for the Loan Repayment tool (budget = loan amount)
 *
 * Prices are in AUD. Images use a stable placeholder service so cards render
 * without bundling binary assets; <AffiliateListings /> hides any image that
 * fails to load.
 */

const PROPERTY_LISTINGS = [
  {
    id: 'prop-1',
    title: '2-Bed Apartment · Footscray, VIC',
    price: 420000,
    image: 'https://picsum.photos/seed/caplet-prop1/640/420',
    url: 'https://example.com/listings/property/prop-1',
    source: 'SampleRealty (demo)',
  },
  {
    id: 'prop-2',
    title: '3-Bed Townhouse · Logan, QLD',
    price: 545000,
    image: 'https://picsum.photos/seed/caplet-prop2/640/420',
    url: 'https://example.com/listings/property/prop-2',
    source: 'SampleRealty (demo)',
  },
  {
    id: 'prop-3',
    title: '3-Bed House · Elizabeth, SA',
    price: 610000,
    image: 'https://picsum.photos/seed/caplet-prop3/640/420',
    url: 'https://example.com/listings/property/prop-3',
    source: 'HomeFinder (demo)',
  },
  {
    id: 'prop-4',
    title: '4-Bed Family Home · Penrith, NSW',
    price: 760000,
    image: 'https://picsum.photos/seed/caplet-prop4/640/420',
    url: 'https://example.com/listings/property/prop-4',
    source: 'HomeFinder (demo)',
  },
  {
    id: 'prop-5',
    title: '4-Bed House · Joondalup, WA',
    price: 895000,
    image: 'https://picsum.photos/seed/caplet-prop5/640/420',
    url: 'https://example.com/listings/property/prop-5',
    source: 'SampleRealty (demo)',
  },
  {
    id: 'prop-6',
    title: 'Townhouse · Inner-North, Canberra ACT',
    price: 1150000,
    image: 'https://picsum.photos/seed/caplet-prop6/640/420',
    url: 'https://example.com/listings/property/prop-6',
    source: 'HomeFinder (demo)',
  },
];

const CAR_LISTINGS = [
  {
    id: 'car-1',
    title: '2016 Toyota Corolla Ascent · Hatch',
    price: 13500,
    image: 'https://picsum.photos/seed/caplet-car1/640/420',
    url: 'https://example.com/listings/cars/car-1',
    source: 'SampleAutos (demo)',
  },
  {
    id: 'car-2',
    title: '2018 Mazda 3 Maxx Sport · Sedan',
    price: 18900,
    image: 'https://picsum.photos/seed/caplet-car2/640/420',
    url: 'https://example.com/listings/cars/car-2',
    source: 'SampleAutos (demo)',
  },
  {
    id: 'car-3',
    title: '2020 Hyundai i30 Active',
    price: 24990,
    image: 'https://picsum.photos/seed/caplet-car3/640/420',
    url: 'https://example.com/listings/cars/car-3',
    source: 'DriveDeals (demo)',
  },
  {
    id: 'car-4',
    title: '2021 Subaru Forester 2.5i-L AWD',
    price: 33500,
    image: 'https://picsum.photos/seed/caplet-car4/640/420',
    url: 'https://example.com/listings/cars/car-4',
    source: 'DriveDeals (demo)',
  },
  {
    id: 'car-5',
    title: '2022 Toyota RAV4 GXL Hybrid',
    price: 45000,
    image: 'https://picsum.photos/seed/caplet-car5/640/420',
    url: 'https://example.com/listings/cars/car-5',
    source: 'SampleAutos (demo)',
  },
  {
    id: 'car-6',
    title: '2023 Tesla Model 3 RWD',
    price: 61900,
    image: 'https://picsum.photos/seed/caplet-car6/640/420',
    url: 'https://example.com/listings/cars/car-6',
    source: 'DriveDeals (demo)',
  },
];

const DATASETS = {
  realestate: PROPERTY_LISTINGS,
  car: CAR_LISTINGS,
};

/**
 * Return sample listings of a given type, filtered to those at or under
 * `maxBudget`. An invalid/absent budget returns the full set for that type.
 *
 * @param {'realestate'|'car'} type
 * @param {number} [maxBudget]
 * @returns {Array<{id,title,price,image,url,source}>}
 */
export function sampleListings(type, maxBudget) {
  const all = DATASETS[type] || PROPERTY_LISTINGS;
  const budget = Number(maxBudget);
  if (!Number.isFinite(budget) || budget <= 0) return all.slice();
  return all.filter((listing) => listing.price <= budget);
}

export { PROPERTY_LISTINGS, CAR_LISTINGS };
export default sampleListings;
