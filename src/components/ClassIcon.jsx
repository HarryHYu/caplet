import { getClassIcon } from '../lib/classIcons';

const sizes = {
  sm: 'h-9 w-9 rounded-xl',
  md: 'h-11 w-11 rounded-2xl',
  lg: 'h-14 w-14 rounded-2xl',
};

/** A local fallback mark for class cards: it never depends on a remote image. */
export default function ClassIcon({ name, size = 'md', className = '' }) {
  const { key, Icon, tone } = getClassIcon(name);

  return (
    <span
      aria-hidden="true"
      data-testid="class-icon"
      data-class-icon={key}
      className={`grid shrink-0 place-items-center border border-line-soft ${sizes[size] || sizes.md} ${tone} ${className}`}
    >
      <Icon className="h-1/2 w-1/2" strokeWidth={1.8} />
    </span>
  );
}
