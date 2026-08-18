import { Link } from 'react-router-dom';
import { ArrowUpRightIcon } from '@heroicons/react/24/outline';

/**
 * Card used by both the financial and educational tool grids
 * (see FinancialTools.jsx and EduTools.jsx). `badge` is optional — pass an
 * unread count to show a small pill next to the arrow.
 */
const ToolCard = ({ tool, badge }) => (
  <Link
    to={tool.path}
    className="group flex min-h-full flex-col gap-4 rounded-lg border border-line-soft bg-surface-body p-6 card-lift focus-ring hover:border-accent/60"
  >
    <div className="flex items-start justify-between">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent">
        {tool.icon}
      </div>
      <div className="flex items-center gap-2">
        {badge > 0 && (
          <span className="grid h-6 min-w-[24px] place-items-center rounded-full bg-accent px-1.5 text-[11px] font-bold leading-none text-accent-contrast">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
        <ArrowUpRightIcon className="h-4 w-4 text-text-dim transition-colors group-hover:text-accent" aria-hidden="true" />
      </div>
    </div>

    <div className="flex-1">
      <h3 className="font-display font-bold tracking-tight text-base text-text-primary mb-1.5 group-hover:text-accent transition-colors duration-200">
        {tool.title}
      </h3>
      <p className="text-sm text-text-muted leading-relaxed line-clamp-2">
        {tool.description}
      </p>
    </div>
  </Link>
);

export default ToolCard;
