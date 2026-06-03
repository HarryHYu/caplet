import { Link } from 'react-router-dom';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import CapletLoader from '../CapletLoader';
import { formatDuration, formatLevel, getLessonCount } from './courseUtils';

export const PageHeader = ({ kicker, title, description, eyebrow, actions, children }) => (
  <header className="mb-16 md:mb-24 reveal-text">
    <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
      <div className="max-w-3xl">
        {eyebrow && (
          <p className="text-sm text-text-muted mb-4">{eyebrow}</p>
        )}
        <span className="section-kicker mb-6">{kicker}</span>
        <h1 className="text-5xl md:text-7xl lg:text-8xl mb-8 tracking-tighter">
          {title}
        </h1>
        {description && (
          <p className="text-xl md:text-2xl text-text-muted font-serif italic leading-relaxed max-w-2xl">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
    {children}
  </header>
);

export const ProgressBar = ({ value = 0, label = 'Progress', className = '' }) => {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));

  return (
    <div className={className}>
      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-text-dim mb-3">
        <span>{label}</span>
        <span className="text-accent">{Math.round(safeValue)}%</span>
      </div>
      <div className="w-full bg-surface-soft h-2 rounded-full overflow-hidden">
        <div
          className="bg-accent h-full rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  );
};

export const LoadingState = ({ message }) => (
  <div className="min-h-screen bg-surface-body flex items-center justify-center px-6 selection:bg-accent selection:text-white">
    <div className="w-full max-w-md rounded-[2rem] border border-line-soft bg-surface-raised p-10 shadow-sm text-center">
      <CapletLoader message={message} />
      <div className="mt-8 grid grid-cols-3 gap-3" aria-hidden="true">
        <span className="h-2 rounded-full bg-accent/30 animate-pulse" />
        <span className="h-2 rounded-full bg-accent/20 animate-pulse [animation-delay:150ms]" />
        <span className="h-2 rounded-full bg-accent/10 animate-pulse [animation-delay:300ms]" />
      </div>
    </div>
  </div>
);

export const EmptyState = ({ kicker = 'Nothing here yet', title, description, action }) => (
  <div className="py-20 md:py-28 px-8 text-center border border-dashed border-line-soft rounded-[2rem] bg-surface-raised reveal-text">
    <span className="section-kicker mb-6">{kicker}</span>
    <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">{title}</h2>
    {description && (
      <p className="text-text-muted max-w-xl mx-auto leading-relaxed mb-8">{description}</p>
    )}
    {action}
  </div>
);

const CourseCover = ({ title }) => {
  const hash = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hue1 = hash % 360;
  const hue2 = (hue1 + 40) % 360;
  const hue3 = (hue1 + 180) % 360;

  return (
    <div className="relative w-full h-full overflow-hidden group-hover:scale-105 transition-transform duration-700">
      <div
        className="absolute inset-0 opacity-80"
        style={{
          background: `linear-gradient(${hue1}deg, hsl(${hue1}, 70%, 85%) 0%, hsl(${hue2}, 70%, 90%) 50%, hsl(${hue3}, 70%, 95%) 100%)`,
        }}
      />
      <div
        className="absolute top-[-20%] left-[-20%] w-[100%] h-[100%] rounded-full blur-[80px] mix-blend-multiply opacity-60"
        style={{ background: `hsl(${hue2}, 80%, 75%)` }}
      />
      <div
        className="absolute bottom-[-30%] right-[-10%] w-[120%] h-[120%] rounded-full blur-[100px] mix-blend-screen opacity-40 animate-float"
        style={{ background: `hsl(${hue3}, 60%, 85%)` }}
      />
      <div className="absolute inset-0 flex items-center justify-center opacity-10">
        <span className="text-[12rem] font-serif italic select-none">{title.charAt(0)}</span>
      </div>
    </div>
  );
};

export const CourseCard = ({ course, progress, to, actionLabel, className = '' }) => {
  const progressValue = Number(progress) || 0;
  const hasProgress = progressValue > 0;
  const lessonCount = getLessonCount(course);
  const description = course.shortDescription || course.description || 'A practical learning pathway from the Caplet curriculum.';

  return (
    <Link
      to={to}
      className={`group bg-surface-body p-8 md:p-10 transition-all duration-500 hover:bg-surface-raised flex flex-col border border-line-soft rounded-[2rem] focus:outline-none focus:ring-2 focus:ring-accent/40 ${className}`}
    >
      <div className="flex justify-between items-start gap-4 mb-8">
        <span className="inline-flex items-center rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-accent capitalize">
          {formatLevel(course.level)}
        </span>
        {hasProgress && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-accent">
            In Progress
          </span>
        )}
      </div>

      <div className="aspect-[16/9] w-full mb-8 overflow-hidden bg-surface-soft border border-line-soft rounded-[1.5rem]">
        {course.thumbnail ? (
          <img src={course.thumbnail} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
        ) : (
          <CourseCover title={course.title} />
        )}
      </div>

      <h3 className="text-2xl font-bold uppercase tracking-tighter mb-4 group-hover:text-accent transition-colors duration-500">
        {course.title}
      </h3>

      <p className="text-sm font-medium text-text-muted leading-relaxed mb-8 line-clamp-3">
        {description}
      </p>

      <div className="mt-auto">
        <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-text-dim mb-8">
          <span>{formatDuration(course.duration)}</span>
          {lessonCount > 0 && (
            <>
              <span className="w-1 h-1 rounded-full bg-text-dim" />
              <span>{lessonCount} lessons</span>
            </>
          )}
        </div>

        {hasProgress && <ProgressBar value={progressValue} className="mb-8" />}

        <div className="flex items-center justify-between pt-6 border-t border-line-soft">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] group-hover:text-accent transition-colors duration-500">
            {actionLabel || (hasProgress ? 'Continue course' : 'Start course')}
          </span>
          <ArrowRightIcon className="w-4 h-4 text-text-dim group-hover:text-accent group-hover:translate-x-2 transition-all duration-500" />
        </div>
      </div>
    </Link>
  );
};
