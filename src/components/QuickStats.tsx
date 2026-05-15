import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import type { Transaction } from '../types';

interface QuickStatsProps {
  transactions: Transaction[];
}

export function QuickStats({ transactions }: QuickStatsProps) {
  const totalIn = transactions
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalOut = transactions
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const txCount = transactions.length;

  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="rounded-2xl bg-slate-800/60 border border-slate-700/40 p-4">
        <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <TrendingUp size={14} className="text-emerald-400" />
        </div>
        <p className="text-xs text-slate-400 mb-0.5">Total In</p>
        <p className="text-base font-bold text-emerald-400 tabular-nums">
          ₦{totalIn.toLocaleString('en-NG', { minimumFractionDigits: 0 })}
        </p>
      </div>

      <div className="rounded-2xl bg-slate-800/60 border border-slate-700/40 p-4">
        <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20">
          <TrendingDown size={14} className="text-red-400" />
        </div>
        <p className="text-xs text-slate-400 mb-0.5">Total Out</p>
        <p className="text-base font-bold text-red-400 tabular-nums">
          ₦{totalOut.toLocaleString('en-NG', { minimumFractionDigits: 0 })}
        </p>
      </div>

      <div className="rounded-2xl bg-slate-800/60 border border-slate-700/40 p-4">
        <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20">
          <Activity size={14} className="text-blue-400" />
        </div>
        <p className="text-xs text-slate-400 mb-0.5">Transactions</p>
        <p className="text-base font-bold text-slate-200 tabular-nums">{txCount}</p>
      </div>
    </div>
  );
}
