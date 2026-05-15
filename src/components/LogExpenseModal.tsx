import { useState, useEffect } from 'react';
import { X, Receipt, DollarSign, Tag } from 'lucide-react';

interface LogExpenseModalProps {
  onClose: () => void;
  onLogExpense: (description: string, amount: number, categoryId: string) => Promise<boolean>;
  currentBalance: number;
  savingsBalance: number;
  categories: { id: string; name: string; color: string }[]; // NEW PROP
}

export function LogExpenseModal({ onClose, onLogExpense, currentBalance, savingsBalance, categories }: LogExpenseModalProps) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  // Default to the first custom category, or empty if none exist yet
  const [categoryId, setCategoryId] = useState(categories.length > 0 ? categories[0].id : ''); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Safety check: if categories load a split second after the modal opens
  useEffect(() => {
    if (categories.length > 0 && !categoryId) {
      setCategoryId(categories[0].id);
    }
  }, [categories, categoryId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!categoryId) {
      setError('Please select a category (Create one first if empty!)');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (parsedAmount > (currentBalance + savingsBalance)) {
      setError('Insufficient total funds (Main + Vault)');
      return;
    }

    setLoading(true);
    // Passing the actual ID instead of the text string
    const success = await onLogExpense(description, parsedAmount, categoryId);
    
    if (success) {
      onClose();
    } else {
      setError('Failed to log expense');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-700 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Receipt className="text-red-400" />
            Log Expense
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-full transition">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-2">Category</label>
            <div className="relative">
              <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full appearance-none rounded-2xl bg-slate-800 border border-slate-700 pl-11 pr-4 py-3.5 text-white focus:outline-none focus:border-red-500/50 transition cursor-pointer"
              >
                {/* Dynamically map through the user's REAL categories! */}
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ... [Keep Description and Amount inputs exactly the same] ... */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-2">Description</label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-2xl bg-slate-800 border border-slate-700 px-4 py-3.5 text-white placeholder-slate-600 focus:outline-none focus:border-red-500/50 transition"
              placeholder="e.g., Uber to work"
            />
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-2">Amount</label>
            <div className="relative">
              <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="number"
                required
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-2xl bg-slate-800 border border-slate-700 pl-11 pr-4 py-3.5 text-white placeholder-slate-600 focus:outline-none focus:border-red-500/50 transition"
                placeholder="0.00"
              />
            </div>
            <p className="text-xs text-slate-500 mt-2 text-right">
              Available: ₦{currentBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </p>
          </div>

          {error && (
            <div className="rounded-xl bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20 text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || categories.length === 0}
            className="w-full rounded-2xl bg-red-500 py-4 font-semibold text-white transition hover:bg-red-600 disabled:opacity-50 mt-2"
          >
            {loading ? 'Logging...' : 'Confirm Expense'}
          </button>
        </form>
      </div>
    </div>
  );
}