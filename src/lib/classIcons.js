import {
  AcademicCapIcon,
  BeakerIcon,
  BookOpenIcon,
  CalculatorIcon,
  ChartBarIcon,
  CodeBracketIcon,
  GlobeAltIcon,
  PaintBrushIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';

const CLASS_ICON_RULES = [
  { key: 'mathematics', match: /\b(math|mathematics|calculus|algebra|statistics)\b/i, Icon: CalculatorIcon, tone: 'block-blue text-blue' },
  { key: 'economics', match: /\b(economics?|business|commerce|finance|accounting)\b/i, Icon: ChartBarIcon, tone: 'block-amber text-amber' },
  { key: 'science', match: /\b(science|biology|chemistry|physics|stem)\b/i, Icon: BeakerIcon, tone: 'block-green text-green' },
  { key: 'english', match: /\b(english|literature|writing|essay|language)\b/i, Icon: PencilSquareIcon, tone: 'block-coral text-coral' },
  { key: 'humanities', match: /\b(history|geography|humanities|global|society|politics)\b/i, Icon: GlobeAltIcon, tone: 'block-blue text-blue' },
  { key: 'creative', match: /\b(art|design|music|drama|creative)\b/i, Icon: PaintBrushIcon, tone: 'block-coral text-coral' },
  { key: 'technology', match: /\b(computing|computer|coding|programming|technology|digital)\b/i, Icon: CodeBracketIcon, tone: 'block-green text-green' },
  { key: 'reading', match: /\b(reading|book|study)\b/i, Icon: BookOpenIcon, tone: 'block-amber text-amber' },
];

export function getClassIcon(name = '') {
  return CLASS_ICON_RULES.find((rule) => rule.match.test(name)) || {
    key: 'default',
    Icon: AcademicCapIcon,
    tone: 'block-cream text-accent',
  };
}
