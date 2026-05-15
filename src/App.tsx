import { useState, useEffect } from 'react';
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from './lib/supabase';
import { useWallet } from './hooks/useWallet';
import { Header } from './components/Header';
import { BalanceCard } from './components/BalanceCard';
import { SavingsCard } from './components/SavingsCard';
import { TransactionList } from './components/TransactionList';
import { BudgetSessionModal } from './components/BudgetSessionModal';
import { BudgetSessionOverlay } from './components/BudgetSessionOverlay';
import { QuickStats } from './components/QuickStats';
import { LogExpenseModal } from './components/LogExpenseModal';
import { SessionHistory } from './components/SessionHistory';
import { Auth } from './components/Auth';
import { Toaster } from 'react-hot-toast';
import { ExpenseChart } from './components/ExpenseChart';
import { SettingsView } from './components/SettingsView';
import toast from 'react-hot-toast';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [initializing, setInitializing] = useState(true);
  const [currentView, setCurrentView] = useState<'dashboard' | 'settings'>('dashboard');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setInitializing(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const { 
    wallet, transactions, chartTransactions, activeSession, pastSessions, categories, loading, error,
    notifications, markAsRead, // <-- FIXED: Added these from your hook!
    moveToVault, withdrawFromVault, startSession, endSession, logExpense, deleteTransaction, editTransaction, refetch
  } = useWallet(session?.user?.id);

  const availableBalance = wallet?.current_balance || 0;

  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  const handleOpenSession = () => {
    if (activeSession) {
      setShowOverlay(true);
    } else {
      setShowSessionModal(true);
    }
  };

  const handleStartSession = async (name: string, budget: number) => {
    const session = await startSession(name, budget);
    if (session) {
      toast.success(`Budget session '${name}' locked in! 🎯`);
      setShowSessionModal(false);
      setShowOverlay(true);
    } else {
      toast.error('Failed to start session');
    }
  };

  const handleEndSession = async () => {
    await endSession();
    toast.success('Session ended! Great job tracking your spending. 🛑');
    setShowOverlay(false);
    await refetch();
  };

  const handleLogExpense = async (description: string, amount: number, categoryId: string) => {
    const success = await logExpense(description, amount, categoryId); 
    if (success) {
      toast.success('Expense logged successfully!');
    } else {
      toast.error('Failed to log expense');
    }
    setShowExpenseModal(false);
    await refetch(); 

    return success;
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-600 shadow-2xl shadow-blue-600/40">
          <Loader2 size={28} className="animate-spin text-white" />
        </div>
        <p className="text-slate-400 text-sm">Loading your wallet...</p>
      </div>
    );
  }

  if (error && !wallet) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 p-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-red-500/15 border border-red-500/20">
          <AlertCircle size={28} className="text-red-400" />
        </div>
        <p className="text-white font-semibold">Connection Error</p>
        <p className="text-slate-400 text-sm text-center max-w-xs">{error}</p>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500 transition"
        >
          <RefreshCw size={14} />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Toaster 
        position="bottom-center" 
        toastOptions={{
          style: {
            background: '#1e293b', 
            color: '#fff',
            borderRadius: '16px',
            border: '1px solid #334155', 
          },
          success: {
            iconTheme: { primary: '#10b981', secondary: '#fff' }, 
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#fff' }, 
          },
        }} 
      />

      <div className="mx-auto max-w-md px-4 pb-10">
        <Header 
          name={wallet?.username || session?.user?.user_metadata?.username || "User"}
          onOpenSettings={() => setCurrentView('settings')}
          notifications={notifications} 
          markAsRead={markAsRead}       
        />

        {currentView === 'settings' ? (
          <SettingsView 
            onClose={() => setCurrentView('dashboard')} 
            session={session} 
            wallet={wallet} 
            onRefetch={refetch} 
          />
        ) : (
          <main className="space-y-4">
            <BalanceCard
              balance={availableBalance}
              onStartSession={handleOpenSession}
              hasActiveSession={!!activeSession}
            />

            <ExpenseChart 
              transactions={chartTransactions} 
              categories={categories} 
            />

            <button
              onClick={() => setShowExpenseModal(true)}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-red-500/10 border border-red-500/20 py-3.5 text-sm font-semibold text-red-400 hover:bg-red-500/20 transition"
            >
              Log New Expense
            </button>

            <SavingsCard 
              savingsBalance={wallet?.savings_balance || 0} 
              currentBalance={availableBalance} 
              onMoveToVault={moveToVault} 
              onWithdrawFromVault={withdrawFromVault} 
            />

            <QuickStats transactions={transactions} />

            <TransactionList 
              transactions={transactions.slice(0, 5)} 
              onDeleteTransaction={deleteTransaction} 
              onEditTransaction={editTransaction} 
            />
            
            <SessionHistory sessions={pastSessions} />
          </main>
        )}
      </div>

      {showSessionModal && wallet && (
        <BudgetSessionModal
          onClose={() => setShowSessionModal(false)}
          onStart={handleStartSession}
          currentBalance={wallet.current_balance}
        />
      )}

      {showOverlay && activeSession && (
        <BudgetSessionOverlay 
          session={activeSession} 
          onEnd={handleEndSession} 
          onLogExpenseClick={() => setShowExpenseModal(true)} 
        />
      )}
      
      {showExpenseModal && wallet && (
       <LogExpenseModal
         onClose={() => setShowExpenseModal(false)}
         categories={categories}
         onLogExpense={handleLogExpense}
         savingsBalance={wallet?.savings_balance || 0}
         currentBalance={availableBalance}
       />
      )}

    </div>
  );
}