-- 람얌이의 가계부 - Database Schema
-- Run this in Supabase SQL Editor

-- 1. Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Accounts table
CREATE TABLE IF NOT EXISTS accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  balance BIGINT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('수입', '지출')),
  icon TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('수입', '지출', '이체')),
  amount BIGINT NOT NULL CHECK (amount > 0),
  account_id UUID NOT NULL REFERENCES accounts(id),
  category_id UUID REFERENCES categories(id),
  transfer_to_account_id UUID REFERENCES accounts(id),
  date DATE NOT NULL,
  memo TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Budgets table
CREATE TABLE IF NOT EXISTS budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  month TEXT NOT NULL, -- YYYY-MM format
  category_id UUID REFERENCES categories(id),
  amount BIGINT NOT NULL CHECK (amount >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(month, category_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_budgets_month ON budgets(month);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- RLS Policies: All authenticated users share all data
CREATE POLICY "Authenticated users can read profiles" ON profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can update own profile" ON profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());

CREATE POLICY "Authenticated users can read accounts" ON accounts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage categories" ON categories
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage transactions" ON transactions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage budgets" ON budgets
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Trigger for auto-creating profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function: Create transaction with balance update (atomic)
CREATE OR REPLACE FUNCTION create_transaction_with_balance(
  p_type TEXT,
  p_amount BIGINT,
  p_account_id UUID,
  p_category_id UUID,
  p_transfer_to_account_id UUID,
  p_date DATE,
  p_memo TEXT,
  p_created_by UUID
) RETURNS UUID AS $$
DECLARE
  v_transaction_id UUID;
BEGIN
  -- Insert transaction
  INSERT INTO transactions (type, amount, account_id, category_id, transfer_to_account_id, date, memo, created_by)
  VALUES (p_type, p_amount, p_account_id, p_category_id, p_transfer_to_account_id, p_date, p_memo, p_created_by)
  RETURNING id INTO v_transaction_id;

  -- Update account balances
  IF p_type = '수입' THEN
    UPDATE accounts SET balance = balance + p_amount, updated_at = NOW() WHERE id = p_account_id;
  ELSIF p_type = '지출' THEN
    UPDATE accounts SET balance = balance - p_amount, updated_at = NOW() WHERE id = p_account_id;
  ELSIF p_type = '이체' THEN
    UPDATE accounts SET balance = balance - p_amount, updated_at = NOW() WHERE id = p_account_id;
    UPDATE accounts SET balance = balance + p_amount, updated_at = NOW() WHERE id = p_transfer_to_account_id;
  END IF;

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Recurring transactions table
CREATE TABLE IF NOT EXISTS recurring_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('수입', '지출')),
  amount BIGINT NOT NULL CHECK (amount > 0),
  account_id UUID NOT NULL REFERENCES accounts(id),
  category_id UUID REFERENCES categories(id),
  day_of_month INTEGER NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
  memo TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  last_processed_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recurring_active ON recurring_transactions(is_active, day_of_month);

ALTER TABLE recurring_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage recurring_transactions" ON recurring_transactions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to recurring_transactions" ON recurring_transactions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Function: Delete transaction with balance rollback
CREATE OR REPLACE FUNCTION delete_transaction_with_balance(p_transaction_id UUID)
RETURNS VOID AS $$
DECLARE
  v_type TEXT;
  v_amount BIGINT;
  v_account_id UUID;
  v_transfer_to_account_id UUID;
BEGIN
  SELECT type, amount, account_id, transfer_to_account_id
  INTO v_type, v_amount, v_account_id, v_transfer_to_account_id
  FROM transactions WHERE id = p_transaction_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;

  -- Reverse balance changes
  IF v_type = '수입' THEN
    UPDATE accounts SET balance = balance - v_amount, updated_at = NOW() WHERE id = v_account_id;
  ELSIF v_type = '지출' THEN
    UPDATE accounts SET balance = balance + v_amount, updated_at = NOW() WHERE id = v_account_id;
  ELSIF v_type = '이체' THEN
    UPDATE accounts SET balance = balance + v_amount, updated_at = NOW() WHERE id = v_account_id;
    UPDATE accounts SET balance = balance - v_amount, updated_at = NOW() WHERE id = v_transfer_to_account_id;
  END IF;

  DELETE FROM transactions WHERE id = p_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Update transaction with balance adjustment
CREATE OR REPLACE FUNCTION update_transaction_with_balance(
  p_transaction_id UUID,
  p_type TEXT,
  p_amount BIGINT,
  p_account_id UUID,
  p_category_id UUID,
  p_transfer_to_account_id UUID,
  p_date DATE,
  p_memo TEXT
) RETURNS VOID AS $$
DECLARE
  v_old_type TEXT;
  v_old_amount BIGINT;
  v_old_account_id UUID;
  v_old_transfer_to_account_id UUID;
BEGIN
  -- Get old values
  SELECT type, amount, account_id, transfer_to_account_id
  INTO v_old_type, v_old_amount, v_old_account_id, v_old_transfer_to_account_id
  FROM transactions WHERE id = p_transaction_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;

  -- Reverse old balance changes
  IF v_old_type = '수입' THEN
    UPDATE accounts SET balance = balance - v_old_amount, updated_at = NOW() WHERE id = v_old_account_id;
  ELSIF v_old_type = '지출' THEN
    UPDATE accounts SET balance = balance + v_old_amount, updated_at = NOW() WHERE id = v_old_account_id;
  ELSIF v_old_type = '이체' THEN
    UPDATE accounts SET balance = balance + v_old_amount, updated_at = NOW() WHERE id = v_old_account_id;
    UPDATE accounts SET balance = balance - v_old_amount, updated_at = NOW() WHERE id = v_old_transfer_to_account_id;
  END IF;

  -- Apply new balance changes
  IF p_type = '수입' THEN
    UPDATE accounts SET balance = balance + p_amount, updated_at = NOW() WHERE id = p_account_id;
  ELSIF p_type = '지출' THEN
    UPDATE accounts SET balance = balance - p_amount, updated_at = NOW() WHERE id = p_account_id;
  ELSIF p_type = '이체' THEN
    UPDATE accounts SET balance = balance - p_amount, updated_at = NOW() WHERE id = p_account_id;
    UPDATE accounts SET balance = balance + p_amount, updated_at = NOW() WHERE id = p_transfer_to_account_id;
  END IF;

  -- Update transaction
  UPDATE transactions SET
    type = p_type,
    amount = p_amount,
    account_id = p_account_id,
    category_id = p_category_id,
    transfer_to_account_id = p_transfer_to_account_id,
    date = p_date,
    memo = p_memo,
    updated_at = NOW()
  WHERE id = p_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
