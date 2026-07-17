import {
  BanknotesIcon,
  BookOpenIcon,
  BuildingLibraryIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ReceiptPercentIcon,
  WalletIcon,
} from '@heroicons/react/24/outline';

const COURSE_ICON_RULES = [
  { key: 'budgeting', match: /\b(budget|budgeting|spending|expense|saving)\b/i, Icon: WalletIcon, tone: 'block-green text-green' },
  { key: 'tax', match: /\b(tax|gst)\b/i, Icon: ReceiptPercentIcon, tone: 'block-coral text-coral' },
  { key: 'investment', match: /\b(invest|market|portfolio|economics?|finance)\b/i, Icon: ChartBarIcon, tone: 'block-amber text-amber' },
  { key: 'banking', match: /\b(loan|mortgage|debt|bank|credit)\b/i, Icon: BanknotesIcon, tone: 'block-blue text-blue' },
  { key: 'planning', match: /\b(plan|retire|superannuation|goal)\b/i, Icon: CalendarDaysIcon, tone: 'block-green text-green' },
  { key: 'business', match: /\b(corporate|business|company)\b/i, Icon: BuildingLibraryIcon, tone: 'block-coral text-coral' },
];

export function getCourseIcon(course = {}) {
  const label = `${course.category || ''} ${course.title || ''}`;
  return COURSE_ICON_RULES.find((rule) => rule.match.test(label)) || {
    key: 'default',
    Icon: BookOpenIcon,
    tone: 'block-cream text-accent',
  };
}
