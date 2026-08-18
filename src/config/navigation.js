import {
  AcademicCapIcon,
  ArrowPathIcon,
  BanknotesIcon,
  BookOpenIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  HomeIcon,
  InformationCircleIcon,
  PencilSquareIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

/**
 * Single source of truth for the study workspace navigation. Every signed-in
 * chrome surface (desktop sidebar, horizontal top bar, mobile hamburger and
 * the tablet dashboard bar) consumes this list so no destination is reachable
 * on one screen size but missing on another.
 */
export const STUDY_NAV_ITEMS = [
  { path: '/dashboard', label: 'Today', icon: HomeIcon, end: true },
  { path: '/classes', label: 'Classes', icon: UserGroupIcon },
  { path: '/library', label: 'Subjects', icon: BookOpenIcon },
  { path: '/notes', label: 'Notes', icon: DocumentTextIcon },
  { path: '/assessment-log', label: 'Results', icon: ClipboardDocumentListIcon },
  { path: '/practice', label: 'Practice', icon: ArrowPathIcon },
  { path: '/study-plan', label: 'Plan', icon: CalendarDaysIcon },
  { path: '/essays', label: 'Essays', icon: PencilSquareIcon },
  { path: '/forum', label: 'Forum', icon: ChatBubbleLeftRightIcon },
];

/** Money is a sibling workspace, not a footer utility, so every chrome
 *  surface appends it directly after the study set — the top bars inline, the
 *  sidebar behind a hairline inside the same primary nav. */
export const MONEY_NAV_ITEM = { path: '/money', label: 'Money', icon: BanknotesIcon };

/**
 * Signed-out (guest) navigation: the public product entry points. Rendered by
 * the desktop top bar and the guest hamburger so visitors are never stuck
 * with a logo and two auth buttons.
 */
export const PUBLIC_NAV_ITEMS = [
  { path: '/library', label: 'Subjects', icon: BookOpenIcon },
  { path: '/courses', label: 'Courses', icon: AcademicCapIcon },
  { path: '/money', label: 'Money', icon: BanknotesIcon },
  { path: '/about', label: 'About', icon: InformationCircleIcon },
];
