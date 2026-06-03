import CalculatorCard from './CalculatorCard';

const ResultPanel = ({ title, result, emptyIcon, emptyMessage, children }) => (
  <CalculatorCard title={title} variant="result">
    {result ? children : (
      <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30 relative z-10">
        <div className="w-12 h-12 border border-line-soft flex items-center justify-center text-xs font-bold font-serif italic mb-8">
          {emptyIcon}
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.4em]">{emptyMessage}</p>
      </div>
    )}
  </CalculatorCard>
);

export default ResultPanel;
