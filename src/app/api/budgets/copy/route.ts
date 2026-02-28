import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { fromMonth, toMonth } = await request.json();

  if (!fromMonth || !toMonth) {
    return NextResponse.json({ error: 'fromMonth, toMonth required' }, { status: 400 });
  }

  const { data: sourceBudgets, error: fetchError } = await supabase
    .from('budgets')
    .select('category_id, amount')
    .eq('month', fromMonth);

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!sourceBudgets?.length) {
    return NextResponse.json({ error: '복사할 예산이 없습니다' }, { status: 404 });
  }

  const newBudgets = sourceBudgets.map((b) => ({
    month: toMonth,
    category_id: b.category_id,
    amount: b.amount,
  }));

  const { error } = await supabase
    .from('budgets')
    .upsert(newBudgets, { onConflict: 'month,category_id' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, count: newBudgets.length });
}
