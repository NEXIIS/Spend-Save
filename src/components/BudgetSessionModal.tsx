import { X, ShoppingBag, Tag, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface BudgetSessionModalProps {
  onClose: () => void;
  onStart: (name: string, budget: number) => Promise<void>;
  currentBalance: number;
}

export function BudgetSessionModal({ onClose, onStart, currentBalance }: BudgetSessionModalProps) {
  const [sessionName, setSessionName] = useState('');
  const [budgetLimit, setBudgetLimit] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleStart = async () => {
    if (!sessionName.trim()) {
      setError('Please enter a session name');
      return;
    }
    const budget = parseFloat(budgetLimit);
    if (!budget || budget <= 0) {
      setError('Please enter a valid budget');
      return;
    }
    if (budget > currentBalance) {
      setError('Budget exceeds available balance');
      return;
    }

    setLoading(true);
    setError('');
    await onStart(sessionName.trim(), budget);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md rounded-3xl bg-slate-900 border border-slate-700/60 p-6 shadow-2xl">
        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/15 border border-blue-500/25">
              <ShoppingBag size={22} className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Start Budget Session</h2>
              <p className="text-sm text-slate-400">Set a budget for your session</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-700/60 hover:text-white transition"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
              Session Name
            </label>
            <div className="relative">
              <Tag size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="e.g. Weekly Groceries"
                className="w-full rounded-xl bg-slate-800 border border-slate-600/50 pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition"
                onKeyDown={(e) => e.key === 'Enter' && handleStart()}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
              Budget Limit
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">
                ₦
              </span>
              <input
                type="number"
                value={budgetLimit}
                onChange={(e) => setBudgetLimit(e.target.value)}
                placeholder="0.00"
                min="1"
                step="0.01"
                className="w-full rounded-2xl bg-slate-800 border border-slate-700 pl-8 pr-4 py-3.5 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 transition"
                onKeyDown={(e) => e.key === 'Enter' && handleStart()}
              />
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              Available: ₦{currentBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </p>
          </div>

          {error && (
            <p className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-sm text-red-400">
              {error}
            </p>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl border border-slate-600/50 py-3.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-700/50"
          >
            Cancel
          </button>
          <button
            onClick={handleStart}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <ShoppingBag size={16} />}
            Launch Session
          </button>
        </div>
      </div>
    </div>
  );
}