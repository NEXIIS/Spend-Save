import { PiggyBank, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface SavingsCardProps {
  savingsBalance: number;
  currentBalance: number;
  onMoveToVault: (amount: number) => Promise<boolean>;
  onWithdrawFromVault: (amount: number) => Promise<boolean>; // ✨ We added the new function here!
}

export function SavingsCard({ savingsBalance, currentBalance, onMoveToVault, onWithdrawFromVault }: SavingsCardProps) {
  const [amount, setAmount] = useState('');
  const [loadingSave, setLoadingSave] = useState(false);
  const [loadingWithdraw, setLoadingWithdraw] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // LOGIC FOR SAVING
  const handleMove = async () => {
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) return;
    if (parsed > currentBalance) {
      setFeedback({ type: 'error', msg: 'Exceeds available balance' });
      return;
    }

    setLoadingSave(true);
    setFeedback(null);
    const ok = await onMoveToVault(parsed);
    setLoadingSave(false);

    if (ok) {
      setFeedback({ type: 'success', msg: `₦${parsed.toFixed(2)} moved to vault` });
      setAmount('');
    } else {
      setFeedback({ type: 'error', msg: 'Transfer failed, please try again' });
    }

    setTimeout(() => setFeedback(null), 3000);
  };

  // ✨ NEW LOGIC FOR WITHDRAWING
  const handleWithdraw = async () => {
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) return;
    
    // Prevent taking out more than is actually in the vault
    if (parsed > savingsBalance) {
      setFeedback({ type: 'error', msg: 'Exceeds your Vault balance!' });
      return;
    }

    setLoadingWithdraw(true);
    setFeedback(null);
    const ok = await onWithdrawFromVault(parsed);
    setLoadingWithdraw(false);

    if (ok) {
      setFeedback({ type: 'success', msg: `₦${parsed.toFixed(2)} withdrawn from vault` });
      setAmount('');
    } else {
      setFeedback({ type: 'error', msg: 'Withdrawal failed, please try again' });
    }

    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div className="rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 p-6 shadow-xl">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-500/20">
          <PiggyBank size={20} className="text-emerald-400" />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-slate-400">Savings Vault</p>
          <p className="text-2xl font-bold text-white">
            ₦{savingsBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-slate-700/40 p-4 border border-slate-600/30">
        <p className="mb-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Transfer Funds</p>
        <div className="flex flex-col sm:flex-row gap-2">
          
          {/* The Shared Number Input */}
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₦</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="w-full rounded-xl bg-slate-800 border border-slate-600/50 pl-7 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition"
            />
          </div>
          
          {/* The Two Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleWithdraw}
              disabled={loadingWithdraw || loadingSave || !amount}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-500 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loadingWithdraw ? <Loader2 size={14} className="animate-spin" /> : <ArrowLeft size={14} />}
              Withdraw
            </button>
            <button
              onClick={handleMove}
              disabled={loadingSave || loadingWithdraw || !amount}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loadingSave ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
              Save
            </button>
          </div>
        </div>

        {feedback && (
          <p className={`mt-2 text-xs font-medium transition-all ${feedback.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
            {feedback.msg}
          </p>
        )}
      </div>
    </div>
  );
}