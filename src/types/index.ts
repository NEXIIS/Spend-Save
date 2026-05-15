export interface UserWallet {
  id: string;
  email: string;
  current_balance: number;
  savings_balance: number;
  created_at: string;
  username?: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  type: string;
  category?: string;
  session_id: string | null;
  created_at: string;
}

export interface ShoppingSession {
  id: string;
  user_id: string;
  name: string;
  budget_limit: number;
  spent_amount: number;
  status: 'active' | 'completed';
  started_at: string;
  ended_at: string | null;
}

export type UserCategory = {
  id: string;
  name: string;
  color: string;
};
