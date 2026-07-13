export const MONEY_MODE_PREFIX = '/money';

export const moneyNavigation = [
  { path: '/money', label: 'Overview', end: true },
  { path: '/money#learn', label: 'Learn', hash: '#learn' },
  { path: '/money/economy/inflation', label: 'Economy', activePrefix: '/money/economy' },
  { path: '/money/tools', label: 'Tools', activePrefix: '/money/tools' },
  { path: '/money/my-money', label: 'My Money', activePrefix: '/money/my-money' },
];

export const STUDY_ROUTE_PREFIXES = [
  '/dashboard',
  '/study-plan',
  '/practice',
  '/mastery',
  '/revision',
  '/essays',
  '/library',
  '/courses',
  '/classes',
  '/edutools',
];

export function isMoneyPath(pathname = '') {
  return pathname === MONEY_MODE_PREFIX || pathname.startsWith(`${MONEY_MODE_PREFIX}/`);
}

export function isStudyPath(pathname = '') {
  return STUDY_ROUTE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function isProductNavItemActive(item, location) {
  const { pathname, hash } = location;
  if (item.hash) return pathname === '/money' && hash === item.hash;
  if (item.end) return pathname === item.path && !hash;
  const prefix = item.activePrefix || item.path;
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}
