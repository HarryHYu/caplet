import { Badge } from '../ui';

export default function OnboardingStep({ children, description, step, title, totalSteps }) {
  return (
    <section className="animate-card-in">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="accent">Step {step} of {totalSteps}</Badge>
          <h2 className="mt-5 text-3xl font-bold tracking-tight text-text-primary md:text-5xl">{title}</h2>
          {description && <p className="mt-4 max-w-2xl text-base leading-7 text-text-muted md:text-lg">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}
