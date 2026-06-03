const FormRow = ({ label, prefix, suffix, size = 'large', italic = true, children, helper }) => {
  const compact = size === 'compact';
  const affixBase = compact ? 'bottom-2 text-sm' : 'bottom-4';

  return (
    <div>
      <label className={`text-[10px] font-black uppercase tracking-[0.4em] text-text-dim mb-4 block${italic ? ' italic' : ''}`}>
        {label}
      </label>
      <div className={`relative ${compact ? 'border-b' : 'border-b-2'} border-line-soft focus-within:border-accent transition-colors`}>
        {prefix && <span className={`absolute left-0 ${affixBase} text-text-dim font-bold`}>{prefix}</span>}
        {children}
        {suffix && <span className={`absolute right-0 ${affixBase} text-text-dim font-bold`}>{suffix}</span>}
      </div>
      {helper && <p className="text-[10px] font-medium text-text-dim mt-4 uppercase tracking-widest">{helper}</p>}
    </div>
  );
};

export default FormRow;
