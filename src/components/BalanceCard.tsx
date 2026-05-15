import { TrendingUp, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

interface BalanceCardProps {
  balance: number;
  onStartSession: () => void;
  hasActiveSession: boolean;
}

export function BalanceCard({ balance, onStartSession, hasActiveSession }: BalanceCardProps) {
  const [visible, setVisible] = useState(true);

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 p-8 text-white shadow-2xl shadow-blue-500/30">
      <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/5" />
      <div className="absolute -bottom-8 -right-4 h-32 w-32 rounded-full bg-white/5" />
      <div className="absolute top-6 left-1/2 h-24 w-96 -translate-x-1/2 rounded-full bg-blue-500/20 blur-3xl" />

      <div className="relative z-10">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
              <TrendingUp size={18} className="text-blue-200" />
            </div>
            <span className="text-sm font-medium text-blue-200 tracking-wide uppercase">Available Balance</span>
          </div>
          <button
            onClick={() => setVisible((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 backdrop-blur transition hover:bg-white/20"
          >
            {visible ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        </div>

        <div className="mb-8">
          <p className="text-5xl font-bold tracking-tight">
            {visible ? `₦${balance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}` : '••••••'}
          </p>
          <p className="mt-1 text-sm text-blue-300">Updated just now</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onStartSession}
            className={`flex-1 rounded-2xl px-5 py-3.5 text-sm font-semibold transition-all duration-200 ${
              hasActiveSession
                ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 hover:bg-emerald-400/30'
                : 'bg-white text-blue-700 hover:bg-blue-50 shadow-lg shadow-black/10'
            }`}
          >
            {hasActiveSession ? 'View Active Session' : 'Start Budget Session'}
          </button>
        </div>
      </div>
    </div>
  );
}