const CalculatorCard = ({ title, variant = 'input', children }) => {
  const isResult = variant === 'result';

  return (
    <div className={isResult ? 'lg:col-span-5 bg-surface-raised p-12 lg:p-20 flex flex-col min-h-full relative overflow-hidden' : 'lg:col-span-7 bg-surface-body p-12 lg:p-20'}>
      {isResult && (
        <div className="absolute inset-0 opacity-[0.03] grid-technical !bg-[size:30px_30px] pointer-events-none" />
      )}
      <h2 className={`text-[10px] font-black uppercase tracking-[0.4em] text-text-muted mb-16${isResult ? ' relative z-10' : ''}`}>
        {title}
      </h2>
      {children}
    </div>
  );
};

export default CalculatorCard;
