import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { UserWallet, Transaction, ShoppingSession, Notification, UserCategory } from '../types';
import toast from 'react-hot-toast';

export function useWallet(userId?: string) {
  const [wallet, setWallet] = useState<UserWallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [chartTransactions, setChartTransactions] = useState<Transaction[]>([]);
  const [activeSession, setActiveSession] = useState<ShoppingSession | null>(null);
  const [pastSessions, setPastSessions] = useState<ShoppingSession[]>([]);
  const [categories, setCategories] = useState<UserCategory[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWallet = useCallback(async () => {
    if (!userId) return; 
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
      const { data: { user } } = await supabase.auth.getUser();
      const customUsername = user?.user_metadata?.username || 'New User';

      const { data: newWallet, error: insertError } = await supabase
        .from('users')
        .insert({ 
          id: userId, 
          current_balance: 0, 
          savings_balance: 0,
          username: customUsername 
        })
        .select()
        .single();
        
      if (insertError) setError(insertError.message);
        else setWallet(newWallet);
      } else {
        setWallet(data);
      }
    } catch (err: any) {
      setError(err.message);
    }
  }, [userId]);

  const fetchTransactions = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setTransactions(data || []);
    } catch (err: any) {
      setError(err.message);
    }
  }, [userId]);

  const fetchChartTransactions = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setChartTransactions(data || []);
    } catch (err: any) {
      setError(err.message);
    }
  }, [userId]);

  const fetchActiveSession = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('shopping_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) setError(error.message);
    else setActiveSession(data);
  }, [userId]);

  const fetchPastSessions = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('shopping_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('started_at', { ascending: false })
      .limit(3); 

    if (error) setError(error.message);
    else setPastSessions(data || []);
  }, [userId]);

  const fetchCategories = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('user_categories')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (err: any) {
      setError(err.message);
    }
  }, [userId]);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      if (data) setNotifications(data);
    } catch (err: any) {
      console.error("Error fetching notifications:", err.message);
    }
  }, [userId]);

  const markAsRead = async (id: string) => {
  setNotifications((prev) =>
    prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
  );

  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (error) throw error;

    setNotifications((prev) => prev.filter((n) => n.id !== id));
  } catch (err: any) {
    console.error("Failed to mark as read:", err.message);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: false } : n))
    );
  }
};
  useEffect(() => {
    if (!userId) {
      setWallet(null);
      setTransactions([]);
      setChartTransactions([]); 
      setActiveSession(null);
      setCategories([]); 
      setLoading(false);
      return;
    }

    const init = async () => {
      setLoading(true); 
      
      await Promise.all([
        fetchWallet(), 
        fetchTransactions(), 
        fetchChartTransactions(),
        fetchNotifications(),
        fetchActiveSession(), 
        fetchPastSessions(), 
        fetchCategories()
      ]);
      
      setLoading(false); 
    };
    
    init();
  }, [userId, fetchWallet, fetchTransactions, fetchChartTransactions, fetchActiveSession, fetchPastSessions, fetchCategories, fetchNotifications]); // <-- FIXED: Removed () from fetchNotifications

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`wallet-realtime-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'transactions', filter: `user_id=eq.${userId}` },
        (payload) => {
          fetchTransactions();
          fetchChartTransactions();
          fetchWallet();
          
          if (payload.new.type === 'vault_overdraft') {
            toast('Vault Overdraft Protection Triggered!', {
              icon: '🚨',
              duration: 5000,
              style: { border: '1px solid #ef4444' } 
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'shopping_sessions', filter: `user_id=eq.${userId}` },
        (payload) => {
          setActiveSession((prev) =>
            prev && prev.id === payload.new.id ? (payload.new as ShoppingSession) : prev
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchTransactions, fetchWallet, fetchChartTransactions]);

  const moveToVault = async (amount: number): Promise<boolean> => {
    if (!userId) return false;
    const { data, error } = await supabase.rpc('move_to_vault', {
      p_user_id: userId,
      p_amount: amount,
    });

    if (error || !data?.success) {
      setError(error?.message || data?.error || 'Failed to move funds');
      toast.error(error?.message || 'Failed to secure funds!'); 
      return false;
    }

    // --- NEW: Trigger Database Notification ---
    await supabase.rpc('create_notification', {
      p_user_id: userId,
      p_type: 'vault',
      p_title: 'Funds Secured',
      p_message: `You successfully saved ₦${amount.toLocaleString()} into your vault.`
    });

    await Promise.all([fetchWallet(), fetchTransactions()]);
    toast.success('Funds secured in Vault'); 
    return true;
  };

  const withdrawFromVault = async (amount: number): Promise<boolean> => {
    if (!userId) return false;
    const { data, error } = await supabase.rpc('withdraw_from_vault', {
      p_user_id: userId,
      p_amount: amount,
    });

    if (error || !data?.success) {
      setError(error?.message || data?.error || 'Failed to withdraw from vault');
      toast.error(data?.error || error?.message || 'Failed to withdraw!');
      return false;
    }

    await Promise.all([fetchWallet(), fetchTransactions()]);
    toast.success(`₦${amount} withdrawn to main balance`);
    return true;
  };

  const startSession = async (name: string, budget: number) => {
    if (!userId) {
      console.error("Cannot start session: No user ID");
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('shopping_sessions')
        .insert([
          {
            user_id: userId, 
            name: name,
            budget_limit: budget, 
            status: 'active'
          }
        ])
        .select()
        .single();

      if (error) {
        console.error("SUPABASE ERROR creating session:", error.message, error.details);
        return null;
      }

      setActiveSession(data); 
      return data;

    } catch (err) {
      console.error("Unexpected error in startSession:", err);
      return null;
    }
  };

  const endSession = async (): Promise<void> => {
    if (!activeSession || !userId) return;

    try {
      const { error } = await supabase
        .from('shopping_sessions')
        .update({ status: 'completed', ended_at: new Date().toISOString() })
        .eq('id', activeSession.id);

      if (error) throw error;
      setActiveSession(null);
    } catch (err: any) {
      console.error("Error ending session:", err.message);
      toast.error("Failed to end session properly");
    }
  };

  const logExpense = async (description: string, amount: number, categoryId: string): Promise<boolean> => {
    if (!userId) return false;

    try {
      const expenseAmount = Math.abs(amount);

      const { data, error } = await supabase.rpc('log_expense', {
        p_user_id: userId,
        p_amount: expenseAmount,
        p_description: description,
        p_category_id: categoryId, 
        p_session_id: activeSession?.id || null 
      });

      if (error || !data?.success) {
        console.error("Database Error:", error?.message || data?.error);
        return false;
      }
      
      await Promise.all([fetchWallet(), fetchTransactions(), fetchActiveSession()]);
      return true;

    } catch (err) {
      console.error("Unexpected error:", err);
      return false;
    }
  };

  const deleteTransaction = async (transactionId: string): Promise<boolean> => {
    if (!userId) return false;

    try {
      const { data, error } = await supabase.rpc('delete_transaction', {
        p_transaction_id: transactionId,
        p_user_id: userId
      });

      const result = data as { success: boolean; error?: string } | null;
      if (error || !result?.success) {
        throw new Error(error?.message || result?.error || 'Failed to delete transaction');
      }

      toast.success('Transaction deleted and refunded! ♻️');
      await Promise.all([fetchWallet(), fetchTransactions(), fetchActiveSession()]);
      return true;

    } catch (err: any) {
      console.error("Error deleting transaction:", err);
      toast.error(err.message || 'Failed to delete transaction');
      return false;
    }
  };

  const editTransaction = async (id: string, newAmount: number, newDesc: string, newCategory: string): Promise<boolean> => {
    if (!userId) return false;

    try {
      const { data, error } = await supabase.rpc('edit_transaction', {
        p_transaction_id: id,
        p_user_id: userId,
        p_new_amount: newAmount,
        p_new_description: newDesc,
        p_new_category: newCategory
      });

      const result = data as { success: boolean; error?: string } | null;
      if (error || !result?.success) {
        throw new Error(error?.message || result?.error || 'Failed to edit transaction');
      }

      toast.success('Transaction updated! ✏️');
      await Promise.all([fetchWallet(), fetchTransactions(), fetchActiveSession()]);
      return true;

    } catch (err: any) {
      console.error("Error editing transaction:", err);
      toast.error(err.message || 'Failed to edit transaction');
      return false;
    }
  };

  return {
    wallet,
    transactions,
    chartTransactions,
    activeSession,
    pastSessions,
    categories,
    loading,
    error,
    notifications,
    markAsRead,
    moveToVault,
    withdrawFromVault,
    startSession,
    endSession,
    logExpense,
    deleteTransaction,
    editTransaction,
    refetch: () => Promise.all([
      fetchWallet(),
      fetchTransactions(),
      fetchChartTransactions(),
      fetchActiveSession(),
      fetchPastSessions(),
      fetchNotifications(),
      fetchCategories(),
]),
  };
}
