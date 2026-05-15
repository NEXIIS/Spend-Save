import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { UserWallet, Transaction, ShoppingSession } from '../types';
import toast from 'react-hot-toast';

export type UserCategory = {
  id: string;
  name: string;
  color: string;
}; 

export function useWallet(userId?: string) {
  const [wallet, setWallet] = useState<UserWallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [chartTransactions, setChartTransactions] = useState<Transaction[]>([]);
  const [activeSession, setActiveSession] = useState<ShoppingSession | null>(null);
  const [pastSessions, setPastSessions] = useState<ShoppingSession[]>([]);
  const [categories, setCategories] = useState<UserCategory[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWallet = useCallback(async () => {
    if (!userId) return; 
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      setError(error.message);
    } else if (!data) {
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
  }, [userId]);

  const fetchTransactions = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) setError(error.message);
    else setTransactions(data || []);
  }, [userId]);

  const fetchChartTransactions = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100); 

    if (error) setError(error.message);
    else setChartTransactions(data || []);
  }, [userId]);

  const fetchActiveSession = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('spending_sessions') 
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)     
      .order('created_at', { ascending: false }) 
      .limit(1)
      .maybeSingle();

    if (error) setError(error.message);
    else setActiveSession(data);
  }, [userId]);

  const fetchPastSessions = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('spending_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', false) 
      .order('created_at', { ascending: false })
      .limit(3); 

    if (error) setError(error.message);
    else setPastSessions(data || []);
  }, [userId]);

  const fetchCategories = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('user_categories')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true }); 

    if (error) setError(error.message);
    else setCategories(data || []);
  }, [userId]);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20); 

    if (!error && data) setNotifications(data);
  }, [userId]);

  const markAsRead = (id: string) => {
    // 1. Instantly update local UI to clear the red dot (feels fast to the user)
    setNotifications((prev) => 
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );

    // 2. Start the 40-second fail-safe timer (40000 ms)
    setTimeout(async () => {
      // 3. Time is up! NOW we officially tell the database it's read
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (!error) {
        // 4. Successfully saved to DB, so we completely remove it from the UI list
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      } else {
        console.error("Failed to mark as read, keeping in list:", error);
        // Optional: If their internet is completely down when the 40s hits, 
        // revert it to 'unread' in the UI so they know it didn't save!
        setNotifications((prev) => 
          prev.map((n) => (n.id === id ? { ...n, is_read: false } : n))
        );
      }
    }, 30000); 
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
        { event: 'UPDATE', schema: 'public', table: 'spending_sessions', filter: `user_id=eq.${userId}` },
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
          setNotifications((prev) => [payload.new, ...prev]);
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
        .from('spending_sessions') 
        .insert([
          {
            user_id: userId, 
            name: name,
            budget_limit: budget, 
            is_active: true
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

    await supabase
      .from('spending_sessions')  
      .update({ is_active: false }) 
      .eq('id', activeSession.id);

    setActiveSession(null);
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

      if (error || !data?.success) {
        throw new Error(error?.message || data?.error || 'Failed to delete transaction');
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

      if (error || !data?.success) {
        throw new Error(error?.message || data?.error || 'Failed to edit transaction');
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
    refetch: () => Promise.all([fetchWallet(), fetchTransactions(), fetchActiveSession(), fetchPastSessions()]),
  };
}