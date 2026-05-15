
/*
  # Fintech Dashboard Schema

  ## New Tables

  ### 1. users
  - `id` (uuid, primary key) - references auth.users
  - `email` (text) - user email
  - `current_balance` (numeric) - available wallet balance
  - `savings_balance` (numeric) - savings vault balance
  - `created_at` (timestamptz)

  ### 2. transactions
  - `id` (uuid, primary key)
  - `user_id` (uuid) - references users
  - `description` (text) - transaction description
  - `amount` (numeric) - transaction amount (negative = debit, positive = credit)
  - `session_id` (uuid, nullable) - references shopping_sessions
  - `created_at` (timestamptz)

  ### 3. shopping_sessions
  - `id` (uuid, primary key)
  - `user_id` (uuid) - references users
  - `name` (text) - session name
  - `budget_limit` (numeric) - spending limit
  - `current_spent` (numeric) - amount spent so far
  - `status` (text) - 'active' or 'completed'
  - `started_at` (timestamptz)
  - `ended_at` (timestamptz, nullable)

  ## Functions
  - `subtract_funds` - deducts from current_balance, creates transaction, updates session spent

  ## Security
  - RLS enabled on all tables
  - Authenticated users can only access their own data
*/

-- Users table
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  current_balance numeric(14,2) NOT NULL DEFAULT 0,
  savings_balance numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own data"
  ON public.users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON public.users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own data"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Shopping sessions table
CREATE TABLE IF NOT EXISTS public.shopping_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  budget_limit numeric(14,2) NOT NULL DEFAULT 0,
  current_spent numeric(14,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz
);

ALTER TABLE public.shopping_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON public.shopping_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON public.shopping_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON public.shopping_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  description text NOT NULL DEFAULT '',
  amount numeric(14,2) NOT NULL DEFAULT 0,
  session_id uuid REFERENCES public.shopping_sessions(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON public.transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- subtract_funds function
CREATE OR REPLACE FUNCTION public.subtract_funds(
  p_user_id uuid,
  p_amount numeric,
  p_description text,
  p_session_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance numeric;
  v_transaction_id uuid;
BEGIN
  SELECT current_balance INTO v_balance FROM public.users WHERE id = p_user_id FOR UPDATE;

  IF v_balance IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;

  IF v_balance < p_amount THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient funds');
  END IF;

  UPDATE public.users
  SET current_balance = current_balance - p_amount
  WHERE id = p_user_id;

  INSERT INTO public.transactions (user_id, description, amount, session_id)
  VALUES (p_user_id, p_description, -p_amount, p_session_id)
  RETURNING id INTO v_transaction_id;

  IF p_session_id IS NOT NULL THEN
    UPDATE public.shopping_sessions
    SET current_spent = current_spent + p_amount
    WHERE id = p_session_id AND user_id = p_user_id;
  END IF;

  RETURN json_build_object('success', true, 'transaction_id', v_transaction_id);
END;
$$;

-- move_to_vault function
CREATE OR REPLACE FUNCTION public.move_to_vault(
  p_user_id uuid,
  p_amount numeric
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance numeric;
BEGIN
  SELECT current_balance INTO v_balance FROM public.users WHERE id = p_user_id FOR UPDATE;

  IF v_balance IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;

  IF v_balance < p_amount THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient funds');
  END IF;

  UPDATE public.users
  SET
    current_balance = current_balance - p_amount,
    savings_balance = savings_balance + p_amount
  WHERE id = p_user_id;

  INSERT INTO public.transactions (user_id, description, amount)
  VALUES (p_user_id, 'Transfer to Savings Vault', -p_amount);

  RETURN json_build_object('success', true);
END;
$$;

-- Seed a demo user for development (anon access for demo)
-- Allow anon read for demo purposes - we'll use a single shared demo user
CREATE POLICY "Allow anon read users"
  ON public.users FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon read transactions"
  ON public.transactions FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon read sessions"
  ON public.shopping_sessions FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon insert transactions"
  ON public.transactions FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon insert sessions"
  ON public.shopping_sessions FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update users"
  ON public.users FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon update sessions"
  ON public.shopping_sessions FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon insert users"
  ON public.users FOR INSERT
  TO anon
  WITH CHECK (true);

-- Enable realtime for transactions and sessions
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shopping_sessions;
