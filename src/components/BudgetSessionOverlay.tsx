import { X, ShoppingCart, TrendingDown, CheckCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ShoppingSession } from '../types';
import { Plus } from 'lucide-react';

interface BudgetSessionOverlayProps {
  session: ShoppingSession; 
  onEnd: () => void;
  onLogExpenseClick: () => void; 
}

export function BudgetSessionOverlay({ session, onEnd, onLogExpenseClick }: BudgetSessionOverlayProps) {
  const [pulse, setPulse] = useState(false);
  
  // FIXED: Add the ? and || 0 so it doesn't crash if session is null
  const [prevSpent, setPrevSpent] = useState(session?.spent_amount || 0); 
  const [confirmEnd, setConfirmEnd] = useState(false);

  // FIXED: Add this safety bounce right here!
  if (!session) return null;

  // CHANGED: current_spent to spent_amount (defaulting to 0 just to be safe!)
  const safeSpentAmount = session.spent_amount || 0;
  const remaining = session.budget_limit - safeSpentAmount;
  const spentPercent = Math.min((safeSpentAmount / session.budget_limit) * 100, 100);
  const isOverBudget = remaining < 0;
  const isWarning = spentPercent > 75 && !isOverBudget;

  useEffect(() => {
    // CHANGED: current_spent to spent_amount
    if (safeSpentAmount !== prevSpent) {
      setPrevSpent(safeSpentAmount);
      setPulse(true);
      const timer = setTimeout(() => setPulse(false), 1200);
      return () => clearTimeout(timer);
    }
  }, [safeSpentAmount, prevSpent]);

  const ringColor = isOverBudget
    ? 'border-red-500'
    : isWarning
    ? 'border-amber-400'
    : 'border-blue-500';

  const glowColor = isOverBudget
    ? 'shadow-red-500/40'
    : isWarning
    ? 'shadow-amber-400/40'
    : 'shadow-blue-500/40';

  const accentColor = isOverBudget
    ? 'text-red-400'
    : isWarning
    ? 'text-amber-400'
    : 'text-blue-400';

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 overflow-hidden">
      <div className="absolute inset-0">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className={`absolute inset-0 rounded-full border transition-all duration-1000 ${
              pulse
                ? isOverBudget
                  ? 'border-red-500/20'
                  : isWarning
                  ? 'border-amber-400/20'
                  : 'border-blue-500/20'
                : 'border-transparent'
            }`}
            style={{
              margin: `${20 + i * 60}px`,
              animationDelay: `${i * 150}ms`,
              transform: pulse ? `scale(${1 + i * 0.05})` : 'scale(1)',
              transition: `transform ${0.6 + i * 0.1}s ease-out, opacity ${0.6 + i * 0.1}s ease-out`,
              opacity: pulse ? 1 - i * 0.2 : 0,
            }}
          />
        ))}
        <div
          className={`absolute inset-0 transition-opacity duration-700 ${pulse ? 'opacity-100' : 'opacity-0'}`}
        >
          <div
            className={`absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl ${
              isOverBudget ? 'bg-red-600/10' : isWarning ? 'bg-amber-500/10' : 'bg-blue-600/10'
            }`}
          />
        </div>
      </div>

      <button
        onClick={() => setConfirmEnd(true)}
        className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 transition z-10"
      >
        <X size={18} />
      </button>

      <div className="relative z-10 flex flex-col items-center gap-10 px-6 text-center max-w-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 mb-1">
            Active Session
          </p>
          <h2 className="text-xl font-bold text-white">{session.name}</h2>
        </div>

        <div className="relative flex items-center justify-center">
          {[3, 2, 1].map((ring) => (
            <div
              key={ring}
              className={`absolute rounded-full border transition-all duration-700 ${
                pulse
                  ? `${ringColor} opacity-${Math.round((1 - (ring - 1) * 0.3) * 10) * 10}`
                  : 'border-transparent opacity-0'
              }`}
              style={{
                width: `${140 + ring * 56}px`,
                height: `${140 + ring * 56}px`,
                transitionDelay: `${(ring - 1) * 80}ms`,
              }}
            />
          ))}

          <div
            className={`relative flex h-36 w-36 flex-col items-center justify-center rounded-full border-4 ${ringColor} bg-slate-900 shadow-2xl ${glowColor} transition-all duration-500 ${
              pulse ? 'scale-105' : 'scale-100'
            }`}
          >
            <ShoppingCart
              size={22}
              className={`mb-1 ${accentColor} transition-colors duration-500`}
            />
            <span
              className={`text-3xl font-black tabular-nums ${accentColor} transition-colors duration-500`}
            >
              ₦{Math.abs(remaining).toLocaleString('en-NG', { minimumFractionDigits: 0 })}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-widest text-slate-500 mt-0.5">
              {isOverBudget ? 'Over Budget' : 'Remaining'}
            </span>
          </div>
        </div>

        <div className="w-full space-y-5">
          <div className="w-full rounded-2xl bg-slate-800/60 border border-slate-700/40 p-4">
            <div className="mb-3 flex justify-between text-xs text-slate-400">
              <span>Spent</span>
              <span>{spentPercent.toFixed(0)}% of budget</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-700 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  isOverBudget ? 'bg-red-500' : isWarning ? 'bg-amber-400' : 'bg-blue-500'
                }`}
                style={{ width: `${spentPercent}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-800/60 border border-slate-700/40 p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingDown size={13} className="text-slate-400" />
                <span className="text-xs text-slate-400 uppercase tracking-wide">Spent</span>
              </div>
              <p className="text-lg font-bold text-white tabular-nums">
                {/* CHANGED: current_spent to spent_amount */}
                ₦{safeSpentAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-800/60 border border-slate-700/40 p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <ShoppingCart size={13} className="text-slate-400" />
                <span className="text-xs text-slate-400 uppercase tracking-wide">Budget</span>
              </div>
              <p className="text-lg font-bold text-white tabular-nums">
                ₦{session.budget_limit.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-4">
          <button
            onClick={onLogExpenseClick}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 transition active:scale-[0.98]"
          >
            <Plus size={18} />
            Log Manual Expense
          </button>

          <p className="text-center text-xs text-slate-500">
            Listening for transactions in real-time...
          </p>
        </div>
      </div>

      {confirmEnd && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700 p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-500/20 mx-auto">
              <CheckCircle size={22} className="text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-white text-center mb-1">End Session?</h3>
            <p className="text-sm text-slate-400 text-center mb-6">
              {/* CHANGED: current_spent to spent_amount */}
              You spent ₦{safeSpentAmount.toFixed(2)} of your ₦{session.budget_limit.toFixed(2)} budget.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmEnd(false)}
                className="flex-1 rounded-2xl border border-slate-600 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition"
              >
                Keep Going
              </button>
              <button
                onClick={onEnd}
                className="flex-1 rounded-2xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-500 transition"
              >
                End Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}