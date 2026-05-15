import { History, CheckCircle2, AlertCircle } from 'lucide-react';
import type { ShoppingSession } from '../types';

interface SessionHistoryProps {
  sessions: ShoppingSession[];
}

export function SessionHistory({ sessions }: SessionHistoryProps) {
  if (!sessions || sessions.length === 0) {
    return null; // Don't show anything if there's no history yet
  }

  return (
    <div className="mt-8">
      <div className="mb-4 flex items-center gap-2">
        <History size={18} className="text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-300">Past Sessions</h3>
      </div>

      <div className="space-y-3">
        {sessions.map((session) => {
          const spent = session.current_spent || 0;
          const isOverBudget = spent > session.budget_limit;
          
          return (
            <div 
              key={session.id} 
              className="flex items-center justify-between rounded-2xl bg-slate-800/50 border border-slate-700/50 p-4 transition hover:bg-slate-800"
            >
              <div>
                <h4 className="font-medium text-white">{session.name}</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Budget: ₦{session.budget_limit.toLocaleString('en-NG')}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className={`font-bold tabular-nums ${isOverBudget ? 'text-red-400' : 'text-emerald-400'}`}>
                    ₦{spent.toLocaleString('en-NG')}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 mt-0.5">
                    {isOverBudget ? 'Overspent' : 'Saved ₦' + (session.budget_limit - spent).toLocaleString('en-NG')}
                  </p>
                </div>
                
                {isOverBudget ? (
                  <AlertCircle size={20} className="text-red-400/80" />
                ) : (
                  <CheckCircle2 size={20} className="text-emerald-400/80" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}