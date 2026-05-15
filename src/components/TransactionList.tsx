import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, ShoppingCart, Info, X, Trash2, Edit2, Save } from 'lucide-react';
import type { Transaction } from '../types';

interface TransactionListProps {
  transactions: Transaction[];
  onDeleteTransaction?: (id: string) => Promise<boolean>;
  onEditTransaction?: (id: string, amount: number, desc: string, category: string) => Promise<boolean>;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
}

function formatExactTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-NG', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getCategoryIcon(description: string) {
  const lower = description.toLowerCase();
  if (lower.includes('grocery') || lower.includes('walmart') || lower.includes('market')) return '🛒';
  if (lower.includes('netflix') || lower.includes('subscription') || lower.includes('spotify')) return '📺';
  if (lower.includes('uber') || lower.includes('lyft') || lower.includes('ride')) return '🚗';
  if (lower.includes('amazon') || lower.includes('purchase')) return '📦';
  if (lower.includes('restaurant') || lower.includes('grill') || lower.includes('food')) return '🍽️';
  if (lower.includes('bill') || lower.includes('electricity') || lower.includes('utility')) return '⚡';
  if (lower.includes('salary') || lower.includes('deposit') || lower.includes('income')) return '💰';
  if (lower.includes('savings') || lower.includes('vault')) return '🏦';
  return '💳';
}

export function TransactionList({ transactions, onDeleteTransaction, onEditTransaction }: TransactionListProps) {
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editDesc, setEditDesc] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('');

  const handleSaveEdit = async () => {
    if (!selectedTx || !onEditTransaction) return;
    
    const amountNum = parseFloat(editAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    // THE FIX: If it's an expense, make sure it stays a negative number in the database!
    const finalAmount = selectedTx.type === 'expense' ? -Math.abs(amountNum) : Math.abs(amountNum);

    const success = await onEditTransaction(selectedTx.id, finalAmount, editDesc, editCategory);
    if (success) {
      setIsEditing(false);
      setSelectedTx(null);
    }
  };

  const startEditing = () => {
    setEditDesc(selectedTx!.description);
    setEditAmount(Math.abs(selectedTx!.amount).toString());
    setEditCategory(selectedTx!.category_id || '');
    setIsEditing(true);
  };

  const handleDelete = async () => {
    if (!selectedTx || !onDeleteTransaction) return;
    
    if (!window.confirm("Are you sure you want to delete this expense? Your balance will be refunded.")) return;

    setIsDeleting(true);
    const success = await onDeleteTransaction(selectedTx.id);
    setIsDeleting(false);
    
    if (success) {
      setSelectedTx(null);
    }
  };

  if (transactions.length === 0) {
    return (
      <div className="rounded-3xl bg-slate-800/50 border border-slate-700/50 p-8 text-center">
        <ShoppingCart size={32} className="mx-auto mb-3 text-slate-600" />
        <p className="text-slate-400">No transactions yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-3xl bg-slate-800/50 border border-slate-700/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700/50">
          <h3 className="font-semibold text-white">Recent Transactions</h3>
          <p className="text-xs text-slate-400 mt-0.5">{transactions.length} recent entries</p>
        </div>

        <div className="divide-y divide-slate-700/30">
          {transactions.map((tx) => {
            const isCredit = tx.amount > 0;
            return (
              <div key={tx.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-700/20 transition-colors">
                <div
                  className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl text-base ${
                    isCredit
                      ? 'bg-emerald-500/10 border border-emerald-500/20'
                      : 'bg-slate-700/60 border border-slate-600/30'
                  }`}
                >
                  {getCategoryIcon(tx.description)}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{tx.description}</p>
                  <p className="text-xs text-slate-400">{formatDate(tx.created_at)}</p>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="flex items-center gap-1.5">
                    {isCredit ? (
                      <ArrowDownLeft size={14} className="text-emerald-400" />
                    ) : (
                      <ArrowUpRight size={14} className="text-red-400" />
                    )}
                    <span
                      className={`text-sm font-semibold tabular-nums ${
                        isCredit ? 'text-emerald-400' : 'text-slate-200'
                      }`}
                    >
                      {isCredit ? '+' : ''}
                      {tx.amount < 0 ? '-' : ''}₦
                      {Math.abs(tx.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  
                  <button 
                    onClick={() => setSelectedTx(tx)}
                    className="p-1.5 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition"
                    title="View Details"
                  >
                    <Info size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700 p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            
            <button 
              onClick={() => { setSelectedTx(null); setIsEditing(false); }}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800 rounded-full transition"
            >
              <X size={16} />
            </button>

            {isEditing ? (
              <div className="space-y-4 mb-6 mt-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Description</label>
                  <input type="text" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Amount (₦)</label>
                  <input type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:border-blue-500" />
                </div>
                <button onClick={handleSaveEdit} className="w-full flex items-center justify-center gap-2 rounded-2xl bg-blue-500/10 border border-blue-500/20 py-3 text-sm font-semibold text-blue-400 hover:bg-blue-500/20 transition">
                  <Save size={16} /> Save Changes
                </button>
              </div>
            ) : (
              <>
                <div className="text-center mt-2 mb-6">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-800 text-3xl mb-4 border border-slate-700">
                    {getCategoryIcon(selectedTx.description)}
                  </div>
                  <h2 className="text-xl font-bold text-white">{selectedTx.description}</h2>
                  <p className={`text-3xl font-bold mt-2 ${selectedTx.amount > 0 ? 'text-emerald-400' : 'text-slate-200'}`}>
                    {selectedTx.amount > 0 ? '+' : ''}{selectedTx.amount < 0 ? '-' : ''}₦{Math.abs(selectedTx.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                {selectedTx.type === 'expense' && (
                  <div className="flex gap-2 mb-6">
                    {onEditTransaction && (
                      <button onClick={startEditing} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-slate-800 border border-slate-700 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-700 transition">
                        <Edit2 size={16} /> Edit
                      </button>
                    )}
                    {onDeleteTransaction && (
                      <button onClick={handleDelete} disabled={isDeleting} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-500/20 transition disabled:opacity-50">
                        <Trash2 size={16} /> {isDeleting ? '...' : 'Delete'}
                      </button>
                    )}
                  </div>
                )}

                <div className="space-y-3 bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Status</span>
                    <span className="text-emerald-400 font-medium">Completed</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Exact Time</span>
                    <span className="text-white font-medium">{formatExactTime(selectedTx.created_at)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Type</span>
                    <span className="text-white font-medium capitalize">{selectedTx.type.replace('_', ' ')}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}