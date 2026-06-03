import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { Card } from '../ui';

export default function OptionCard({ description, icon, name, onChange, selected = false, title, type = 'radio', value }) {
  const inputId = `${name}-${value}`;

  return (
    <label htmlFor={inputId} className="block h-full cursor-pointer">
      <input
        id={inputId}
        name={name}
        type={type}
        value={value}
        checked={selected}
        onChange={onChange}
        className="sr-only"
      />
      <Card
        interactive
        className={`relative flex h-full flex-col gap-4 ${
          selected ? 'border-accent bg-accent-soft shadow-glow' : 'hover:bg-surface-soft'
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          {icon && <span className="text-3xl" aria-hidden="true">{icon}</span>}
          <CheckCircleIcon
            className={`h-6 w-6 shrink-0 transition-all ${selected ? 'scale-100 text-accent' : 'scale-75 text-text-dim opacity-30'}`}
            aria-hidden="true"
          />
        </div>
        <div>
          <p className="text-lg font-bold tracking-tight text-text-primary">{title}</p>
          {description && <p className="mt-2 text-sm leading-6 text-text-muted">{description}</p>}
        </div>
      </Card>
    </label>
  );
}
