import { cn } from './utils';

const alignmentClasses = {
  left: '',
  center: 'mx-auto max-w-4xl text-center',
};

const PageHeader = ({ actions, align = 'left', children, className = '', description, eyebrow, kicker, title }) => {
  const label = eyebrow || kicker;
  const body = description || children;

  return (
    <header className={cn('mb-16 md:mb-20 reveal-text', alignmentClasses[align] || alignmentClasses.left, className)}>
      {label && <span className="section-kicker mb-6">{label}</span>}
      <div className={cn('flex flex-col gap-8', align === 'center' ? 'items-center' : 'lg:flex-row lg:items-end lg:justify-between')}>
        <div>
          <h1 className="text-5xl md:text-7xl lg:text-8xl mb-8">
            {title}
          </h1>
          {body && (
            <p className="text-xl md:text-2xl text-text-muted font-serif italic max-w-2xl leading-relaxed">
              {body}
            </p>
          )}
        </div>
        {actions && <div className="flex flex-wrap gap-3 lg:max-w-md">{actions}</div>}
      </div>
    </header>
  );
};

export default PageHeader;
