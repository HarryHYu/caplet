import { Link } from 'react-router-dom';

/**
 * Card used by both the financial and educational tool grids
 * (see FinancialTools.jsx and EduTools.jsx). `badge` is optional — pass an
 * unread count to show a small pill next to the arrow.
 */
const ToolCard = ({ tool, badge }) => (
  <Link
    to={tool.path}
    className="group flex flex-col gap-4 p-6 bg-surface-raised rounded-2xl shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)] hover:-translate-y-0.5 transition-transform duration-200"
  >
    <div className="flex items-start justify-between">
      <div className="w-11 h-11 flex items-center justify-center rounded-xl bg-accent text-white shadow-[0_12px_24px_-16px_rgba(20,20,18,0.5)]">
        {tool.icon}
      </div>
      <div className="flex items-center gap-2">
        {badge > 0 && (
          <span className="grid h-6 min-w-[24px] place-items-center rounded-full bg-accent px-1.5 text-[11px] font-bold leading-none text-white">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
        <svg
          className="w-4 h-4 text-text-dim group-hover:text-accent group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L17 7M17 7H7M17 7v10" />
        </svg>
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
