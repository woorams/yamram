import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const month = request.nextUrl.searchParams.get('month');

  if (!month) {
    return NextResponse.json({ error: 'month parameter required' }, { status: 400 });
  }

  const startDate = `${month}-01`;
  const [year, mon] = month.split('-').map(Number);
  const lastDay = new Date(year, mon, 0).getDate();
  const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;

  // Get monthly summary
  const { data: transactions } = await supabase
    .from('transactions')
    .select('type, amount')
    .gte('date', startDate)
    .lte('date', endDate);

  const summary = {
    total_income: 0,
    total_expense: 0,
    balance: 0,
  };

  transactions?.forEach((t) => {
    if (t.type === '수입') summary.total_income += t.amount;
    if (t.type === '지출') summary.total_expense += t.amount;
  });
  summary.balance = summary.total_income - summary.total_expense;

  // Get category breakdown for expenses
  const { data: expensesByCategory } = await supabase
    .from('transactions')
    .select('category_id, amount, category:categories(name)')
    .eq('type', '지출')
    .gte('date', startDate)
    .lte('date', endDate);

  const categoryMap = new Map<string, { name: string; total: number }>();
  expensesByCategory?.forEach((t) => {
    const catId = t.category_id || 'uncategorized';
    const catObj = t.category as unknown as { name: string } | null;
    const catName = catObj?.name || '미분류';
    const existing = categoryMap.get(catId) || { name: catName, total: 0 };
    existing.total += t.amount;
    categoryMap.set(catId, existing);
  });

  const category_breakdown = Array.from(categoryMap.entries())
    .map(([id, { name, total }]) => ({
      category_id: id,
      category_name: name,
      total,
      percentage: summary.total_expense > 0
        ? Math.round((total / summary.total_expense) * 100)
        : 0,
    }))
    .sort((a, b) => b.total - a.total);

  // Get recent transactions
  const { data: recent } = await supabase
    .from('transactions')
    .select('*, account:accounts!account_id(*), category:categories(*)')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(5);

  // Get budgets for the month
  const { data: budgets } = await supabase
    .from('budgets')
    .select('*, category:categories(*)')
    .eq('month', month);

  // Calculate spent per budget
  const budgetsWithSpent = budgets?.map((b) => {
    if (b.category_id) {
      const spent = expensesByCategory
        ?.filter((t) => t.category_id === b.category_id)
        .reduce((sum, t) => sum + t.amount, 0) || 0;
      return { ...b, spent };
    }
    return { ...b, spent: summary.total_expense };
  }) || [];

  return NextResponse.json({
    summary,
    category_breakdown,
    recent_transactions: recent || [],
    budgets: budgetsWithSpent,
  });
}
