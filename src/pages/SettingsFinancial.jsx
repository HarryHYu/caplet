import { useState, useEffect } from 'react';
import api from '../services/api';
import CapletLoader from '../components/CapletLoader';

const fmtMoney = (n) =>
  new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);

const emptyForm = {
  annualIncome: '',
  savingsBalance: '',
  superBalance: '',
  monthlyExpenses: '',
  debts: [],
  goals: [],
};

const inputClass =
  'w-full px-0 py-4 bg-transparent border-b border-line-soft focus:border-accent outline-none transition-all text-text-primary font-medium text-sm';

const SettingsFinancial = () => {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    let active = true;
    api
      .getFinancialProfile()
      .then(({ financialProfile: p }) => {
        if (!active || !p) return;
        const numStr = (v) => (v === null || v === undefined ? '' : String(v));
        setForm({
          annualIncome: numStr(p.annualIncome),
          savingsBalance: numStr(p.savingsBalance),
          superBalance: numStr(p.superBalance),
          monthlyExpenses: numStr(p.monthlyExpenses),
          debts: Array.isArray(p.debts) ? p.debts.filter(Boolean).map((d) => ({ label: d.label || '', balance: numStr(d.balance), rate: numStr(d.rate) })) : [],
          goals: Array.isArray(p.goals) ? p.goals.filter(Boolean).map((g) => ({ label: g.label || '', target: numStr(g.target) })) : [],
        });
      })
      .catch((err) => {
        if (active) setMessage({ type: 'error', text: err.message || 'Failed to load your financial profile.' });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleMoneyChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Debt rows
  const addDebt = () => setForm((p) => ({ ...p, debts: [...p.debts, { label: '', balance: '', rate: '' }] }));
  const removeDebt = (i) => setForm((p) => ({ ...p, debts: p.debts.filter((_, idx) => idx !== i) }));
  const updateDebt = (i, key, value) =>
    setForm((p) => ({ ...p, debts: p.debts.map((d, idx) => (idx === i ? { ...d, [key]: value } : d)) }));

  // Goal rows
  const addGoal = () => setForm((p) => ({ ...p, goals: [...p.goals, { label: '', target: '' }] }));
  const removeGoal = (i) => setForm((p) => ({ ...p, goals: p.goals.filter((_, idx) => idx !== i) }));
  const updateGoal = (i, key, value) =>
    setForm((p) => ({ ...p, goals: p.goals.map((g, idx) => (idx === i ? { ...g, [key]: value } : g)) }));

  // Live net worth estimate (current snapshot only).
  const savings = parseFloat(form.savingsBalance) || 0;
  const superBal = parseFloat(form.superBalance) || 0;
  const totalDebt = form.debts.reduce((sum, d) => sum + (parseFloat(d.balance) || 0), 0);
  const netWorth = savings + superBal - totalDebt;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const money = (v) => (String(v).trim() === '' ? null : Number(v));
      const payload = {
        annualIncome: money(form.annualIncome),
        savingsBalance: money(form.savingsBalance),
        superBalance: money(form.superBalance),
        monthlyExpenses: money(form.monthlyExpenses),
        debts: form.debts
          .filter((d) => d.label.trim() || String(d.balance).trim())
          .map((d) => ({ label: d.label.trim(), balance: Number(d.balance) || 0, rate: Number(d.rate) || 0 })),
        goals: form.goals
          .filter((g) => g.label.trim() || String(g.target).trim())
          .map((g) => ({ label: g.label.trim(), target: Number(g.target) || 0 })),
      };
      const { financialProfile: p } = await api.updateFinancialProfile(payload);
      const numStr = (v) => (v === null || v === undefined ? '' : String(v));
      setForm({
        annualIncome: numStr(p.annualIncome),
        savingsBalance: numStr(p.savingsBalance),
        superBalance: numStr(p.superBalance),
        monthlyExpenses: numStr(p.monthlyExpenses),
        debts: (p.debts || []).filter(Boolean).map((d) => ({ label: d.label || '', balance: numStr(d.balance), rate: numStr(d.rate) })),
        goals: (p.goals || []).filter(Boolean).map((g) => ({ label: g.label || '', target: numStr(g.target) })),
      });
      setMessage({ type: 'success', text: 'Financial profile saved.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to save your financial profile.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 flex justify-center">
        <CapletLoader message="Loading your financial profile…" />
      </div>
    );
  }

  return (
    <div>
      <div className="pb-8 border-b border-line-soft mb-12">
        <h2 className="text-xl font-bold text-text-primary">Financial Profile.</h2>
        <p className="text-sm font-medium text-text-dim mt-2">
          Your current snapshot. We use it to tailor the tools and your next steps — it&apos;s private to you.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-10">
        {message.text && (
          <div
            className={`px-6 py-4 border font-medium text-sm ${message.type === 'success'
              ? 'border-accent text-accent'
              : 'border-red-500 text-red-500'
              }`}
          >
            {message.type === 'success' ? 'Success:' : 'Error:'} {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
          <div className="space-y-3">
            <label htmlFor="annualIncome" className="block text-sm font-semibold text-text-dim">
              Annual Income (AUD)
            </label>
            <input id="annualIncome" name="annualIncome" type="number" min="0" max="2147483647" step="1"
              value={form.annualIncome} onChange={handleMoneyChange} placeholder="e.g. 80000" className={inputClass} />
          </div>
          <div className="space-y-3">
            <label htmlFor="savingsBalance" className="block text-sm font-semibold text-text-dim">
              Savings Balance (AUD)
            </label>
            <input id="savingsBalance" name="savingsBalance" type="number" min="0" max="2147483647" step="1"
              value={form.savingsBalance} onChange={handleMoneyChange} placeholder="e.g. 5000" className={inputClass} />
          </div>
          <div className="space-y-3">
            <label htmlFor="superBalance" className="block text-sm font-semibold text-text-dim">
              Super Balance (AUD)
            </label>
            <input id="superBalance" name="superBalance" type="number" min="0" max="2147483647" step="1"
              value={form.superBalance} onChange={handleMoneyChange} placeholder="e.g. 15000" className={inputClass} />
          </div>
          <div className="space-y-3">
            <label htmlFor="monthlyExpenses" className="block text-sm font-semibold text-text-dim">
              Monthly Expenses (AUD)
            </label>
            <input id="monthlyExpenses" name="monthlyExpenses" type="number" min="0" max="2147483647" step="1"
              value={form.monthlyExpenses} onChange={handleMoneyChange} placeholder="e.g. 2500" className={inputClass} />
          </div>
        </div>

        {/* Debts */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-dim">Debts</h3>
            <button type="button" onClick={addDebt} className="text-xs font-semibold text-accent hover:underline">
              + Add debt
            </button>
          </div>
          {form.debts.length === 0 ? (
            <p className="text-xs font-medium text-text-dim">No debts added. Add one to plan a payoff.</p>
          ) : (
            <div className="space-y-4">
              {form.debts.map((d, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                  <input type="text" value={d.label} onChange={(e) => updateDebt(i, 'label', e.target.value)}
                    placeholder="Label (e.g. Visa)" className={`${inputClass} sm:col-span-5`} maxLength={80} />
                  <input type="number" min="0" step="1" value={d.balance} onChange={(e) => updateDebt(i, 'balance', e.target.value)}
                    placeholder="Balance" className={`${inputClass} sm:col-span-3`} />
                  <input type="number" min="0" max="100" step="0.1" value={d.rate} onChange={(e) => updateDebt(i, 'rate', e.target.value)}
                    placeholder="Rate %" className={`${inputClass} sm:col-span-3`} />
                  <button type="button" onClick={() => removeDebt(i)}
                    className="sm:col-span-1 text-xs font-medium text-red-500 hover:text-red-600 text-left sm:text-center">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Goals */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-dim">Goals</h3>
            <button type="button" onClick={addGoal} className="text-xs font-semibold text-accent hover:underline">
              + Add goal
            </button>
          </div>
          {form.goals.length === 0 ? (
            <p className="text-xs font-medium text-text-dim">No goals yet. Add a target to work towards.</p>
          ) : (
            <div className="space-y-4">
              {form.goals.map((g, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                  <input type="text" value={g.label} onChange={(e) => updateGoal(i, 'label', e.target.value)}
                    placeholder="Goal (e.g. House deposit)" className={`${inputClass} sm:col-span-7`} maxLength={80} />
                  <input type="number" min="0" step="1" value={g.target} onChange={(e) => updateGoal(i, 'target', e.target.value)}
                    placeholder="Target" className={`${inputClass} sm:col-span-4`} />
                  <button type="button" onClick={() => removeGoal(i)}
                    className="sm:col-span-1 text-xs font-medium text-red-500 hover:text-red-600 text-left sm:text-center">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Net worth snapshot */}
        <div className="px-6 py-5 bg-surface-soft border border-line-soft">
          <p className="text-xs font-semibold text-text-dim mb-1">Estimated net worth</p>
          <p className="text-2xl font-bold text-text-primary">{fmtMoney(netWorth)}</p>
          <p className="text-xs font-medium text-text-dim mt-1">Savings + super − total debt. A snapshot, not advice.</p>
        </div>

        <div className="pt-2">
          <button type="submit" disabled={saving} className="btn-primary py-5 px-10 text-sm disabled:opacity-30">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SettingsFinancial;
