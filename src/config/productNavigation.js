export const MONEY_MODE_PREFIX = '/money';

export const moneyNavigation = [
  { path: '/money', label: 'Overview', end: true },
  { path: '/money#learn', label: 'Learn', hash: '#learn' },
  { path: '/money/economy/inflation', label: 'Economy', activePrefix: '/money/economy' },
  { path: '/money/resources', label: 'Resources', activePrefix: '/money/resources' },
  { path: '/money/tools', label: 'Tools', activePrefix: '/money/tools' },
  {
    path: '/money/my-money',
    label: 'My Money',
    activePrefix: '/money/my-money',
    privateOnly: true,
    flagKey: 'money.private.persistence',
  },
];

const MONEY_ROUTE_REQUIREMENTS = [
  { prefix: '/money/my-money', privateOnly: true, flagKey: 'money.private.persistence' },
  { prefix: '/money/tools/debt-sequencer', privateOnly: true, flagKey: 'money.private.persistence' },
  { prefix: '/money/tools/financial-twin', privateOnly: true, flagKey: 'money.financial_twin.enabled' },
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

export function canAccessMoneyRoute(
  route = '',
  { isAuthenticated = false, featureFlagsLoading = false, isFeatureEnabled = () => false } = {},
) {
  const pathname = route.split(/[?#]/, 1)[0];
  if (!isMoneyPath(pathname)) return false;
  const requirement = MONEY_ROUTE_REQUIREMENTS.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (!requirement) return true;
  if (requirement.privateOnly && !isAuthenticated) return false;
  if (requirement.flagKey && featureFlagsLoading) return false;
  return !requirement.flagKey || isFeatureEnabled(requirement.flagKey);
}

export function availableMoneyNavigation(options) {
  return moneyNavigation.filter((item) => canAccessMoneyRoute(item.path, options));
}

export function isProductNavItemActive(item, location) {
  const { pathname, hash } = location;
  if (item.hash) return pathname === '/money' && hash === item.hash;
  if (item.end) return pathname === item.path && !hash;
  const prefix = item.activePrefix || item.path;
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}
