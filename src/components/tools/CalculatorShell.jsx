const CalculatorShell = ({ children }) => (
  <div className="min-h-screen bg-surface-body py-32 selection:bg-accent selection:text-white">
    <div className="container-custom">{children}</div>
  </div>
);

export default CalculatorShell;
