const PageHeader = ({ kicker, title, description, children, className = '' }) => (
  <header className={`mb-16 md:mb-20 reveal-text ${className}`}>
    {kicker && <span className="section-kicker mb-6">{kicker}</span>}
    <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 className="text-5xl md:text-7xl lg:text-8xl mb-8">
          {title}
        </h1>
        {description && (
          <p className="text-xl md:text-2xl text-text-muted font-serif italic max-w-2xl leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {children && <div className="lg:max-w-md">{children}</div>}
    </div>
  </header>
);

export default PageHeader;
