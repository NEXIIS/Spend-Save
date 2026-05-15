-- Add missing columns and tables to align with Money-Watch architecture

-- Update users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS username text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bank_balance numeric(14,2) NOT NULL DEFAULT 0;

-- Create user_settings table
CREATE TABLE IF NOT EXISTS public.user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  daily_limit numeric(14,2),
  weekly_limit numeric(14,2),
  monthly_limit numeric(14,2),
  daily_savings_goal numeric(14,2),
  weekly_savings_goal numeric(14,2),
  monthly_savings_goal numeric(14,2),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings"
  ON public.user_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON public.user_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON public.user_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Ensure transactions table matches schema
-- The initial migration might have different names, let's align them.
-- In AI_CONTEXT.md, transactions has 'category' (text) and 'date' (timestamptz)
-- In initial migration, it has 'description' (text) and 'created_at' (timestamptz).
-- We'll keep description and created_at but add type and category as text.
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS type text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS category text;
-- Also add category_id for our dynamic category feature
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS category_id uuid;

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create user_categories table (for the LogExpenseModal dynamic categories)
CREATE TABLE IF NOT EXISTS public.user_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own categories"
  ON public.user_categories FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- RPC Functions

-- create_notification function
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message)
  VALUES (p_user_id, p_type, p_title, p_message);
END;
$$;

-- withdraw_from_vault function
CREATE OR REPLACE FUNCTION public.withdraw_from_vault(
  p_user_id uuid,
  p_amount numeric
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_savings numeric;
BEGIN
  SELECT savings_balance INTO v_savings FROM public.users WHERE id = p_user_id FOR UPDATE;

  IF v_savings IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;

  IF v_savings < p_amount THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient funds in vault');
  END IF;

  UPDATE public.users
  SET
    current_balance = current_balance + p_amount,
    savings_balance = savings_balance - p_amount
  WHERE id = p_user_id;

  INSERT INTO public.transactions (user_id, description, amount, type)
  VALUES (p_user_id, 'Withdrawal from Savings Vault', p_amount, 'transfer');

  RETURN json_build_object('success', true);
END;
$$;

-- log_expense function
CREATE OR REPLACE FUNCTION public.log_expense(
  p_user_id uuid,
  p_amount numeric,
  p_description text,
  p_category_id uuid,
  p_session_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance numeric;
  v_transaction_id uuid;
  v_category_name text;
BEGIN
  SELECT current_balance INTO v_balance FROM public.users WHERE id = p_user_id FOR UPDATE;
  SELECT name INTO v_category_name FROM public.user_categories WHERE id = p_category_id;

  IF v_balance < p_amount THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient funds');
  END IF;

  UPDATE public.users
  SET current_balance = current_balance - p_amount
  WHERE id = p_user_id;

  INSERT INTO public.transactions (user_id, description, amount, category_id, category, session_id, type)
  VALUES (p_user_id, p_description, -p_amount, p_category_id, v_category_name, p_session_id, 'expense')
  RETURNING id INTO v_transaction_id;

  IF p_session_id IS NOT NULL THEN
    UPDATE public.shopping_sessions
    SET current_spent = current_spent + p_amount
    WHERE id = p_session_id AND user_id = p_user_id;
  END IF;

  RETURN json_build_object('success', true, 'transaction_id', v_transaction_id);
END;
$$;

-- delete_transaction function
CREATE OR REPLACE FUNCTION public.delete_transaction(
  p_transaction_id uuid,
  p_user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_amount numeric;
  v_session_id uuid;
BEGIN
  SELECT amount, session_id INTO v_amount, v_session_id
  FROM public.transactions
  WHERE id = p_transaction_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Transaction not found');
  END IF;

  -- Refund the amount to user balance (amount is negative for expenses)
  UPDATE public.users
  SET current_balance = current_balance - v_amount
  WHERE id = p_user_id;

  -- Update session spent if applicable
  IF v_session_id IS NOT NULL THEN
    UPDATE public.shopping_sessions
    SET current_spent = current_spent + v_amount
    WHERE id = v_session_id AND user_id = p_user_id;
  END IF;

  DELETE FROM public.transactions WHERE id = p_transaction_id;

  RETURN json_build_object('success', true);
END;
$$;

-- edit_transaction function
CREATE OR REPLACE FUNCTION public.edit_transaction(
  p_transaction_id uuid,
  p_user_id uuid,
  p_new_amount numeric,
  p_new_description text,
  p_new_category uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_amount numeric;
  v_session_id uuid;
  v_diff numeric;
  v_category_name text;
BEGIN
  SELECT amount, session_id INTO v_old_amount, v_session_id
  FROM public.transactions
  WHERE id = p_transaction_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Transaction not found');
  END IF;

  SELECT name INTO v_category_name FROM public.user_categories WHERE id = p_new_category;

  v_diff := (-p_new_amount) - v_old_amount;

  UPDATE public.users
  SET current_balance = current_balance + v_diff
  WHERE id = p_user_id;

  IF v_session_id IS NOT NULL THEN
    UPDATE public.shopping_sessions
    SET current_spent = current_spent - v_diff
    WHERE id = v_session_id AND user_id = p_user_id;
  END IF;

  UPDATE public.transactions
  SET
    amount = -p_new_amount,
    description = p_new_description,
    category_id = p_new_category,
    category = v_category_name
  WHERE id = p_transaction_id;

  RETURN json_build_object('success', true);
END;
$$;

-- Realtime enablement
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
