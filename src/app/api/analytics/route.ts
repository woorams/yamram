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
  const daysInMonth = new Date(year, mon, 0).getDate();
  const endDate = `${month}-${String(daysInMonth).padStart(2, '0')}`;

  // All transactions for the month
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*, category:categories(name)')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date');

  // Daily breakdown
  const dailyData: Record<string, { income: number; expense: number }> = {};
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${month}-${String(d).padStart(2, '0')}`;
    dailyData[key] = { income: 0, expense: 0 };
  }

  // Category breakdown
  const categoryData: Record<string, number> = {};

  transactions?.forEach((t) => {
    const day = dailyData[t.date];
    if (day) {
      if (t.type === '수입') day.income += t.amount;
      if (t.type === '지출') day.expense += t.amount;
    }
    if (t.type === '지출') {
      const catName = (t.category as { name: string } | null)?.name || '미분류';
      categoryData[catName] = (categoryData[catName] || 0) + t.amount;
    }
  });

  // Monthly trend (last 6 months)
  const monthlyTrend = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(year, mon - 1 - i, 1);
    const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const mStart = `${m}-01`;
    const mLastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const mEnd = `${m}-${String(mLastDay).padStart(2, '0')}`;

    const { data: mTx } = await supabase
      .from('transactions')
      .select('type, amount')
      .gte('date', mStart)
      .lte('date', mEnd);

    let income = 0, expense = 0;
    mTx?.forEach((t) => {
      if (t.type === '수입') income += t.amount;
      if (t.type === '지출') expense += t.amount;
    });

    monthlyTrend.push({ month: m, income, expense });
  }

  // Budgets
  const { data: budgets } = await supabase
    .from('budgets')
    .select('*, category:categories(name)')
    .eq('month', month);

  const budgetProgress = budgets?.map((b) => {
    let spent = 0;
    if (b.category_id) {
      transactions?.forEach((t) => {
        if (t.type === '지출' && t.category_id === b.category_id) {
          spent += t.amount;
        }
      });
    } else {
      transactions?.forEach((t) => {
        if (t.type === '지출') spent += t.amount;
      });
    }
    return {
      name: b.category ? (b.category as { name: string }).name : '전체 예산',
      budget: b.amount,
      spent,
      percentage: b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0,
    };
  }) || [];

  return NextResponse.json({
    daily: Object.entries(dailyData).map(([date, data]) => ({ date, ...data })),
    categories: Object.entries(categoryData)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total),
    monthlyTrend,
    budgetProgress,
  });
}
