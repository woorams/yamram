export type TransactionType = '수입' | '지출' | '이체';
export type CategoryType = '수입' | '지출';

export interface Profile {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export interface Account {
  id: string;
  name: string;
  balance: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  icon: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  account_id: string;
  category_id: string | null;
  transfer_to_account_id: string | null;
  date: string;
  memo: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  account?: Account;
  category?: Category;
  transfer_to_account?: Account;
  profile?: Profile;
}

export interface Budget {
  id: string;
  month: string; // YYYY-MM
  category_id: string | null;
  amount: number;
  created_at: string;
  updated_at: string;
  // Joined
  category?: Category;
  spent?: number;
}

export interface MonthlySummary {
  total_income: number;
  total_expense: number;
  balance: number;
}

export interface CategoryBreakdown {
  category_id: string;
  category_name: string;
  total: number;
  percentage: number;
}

export interface DashboardData {
  summary: MonthlySummary;
  category_breakdown: CategoryBreakdown[];
  recent_transactions: Transaction[];
  budgets: Budget[];
}

export interface ExcelRow {
  date: string;
  type: TransactionType;
  amount: number;
  category: string;
  account: string;
  transferTo?: string;
  memo?: string;
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export interface ParsedExcelData {
  valid: ExcelRow[];
  errors: ValidationError[];
}
