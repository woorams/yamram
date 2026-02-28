import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { transactions } = await request.json();

  if (!Array.isArray(transactions) || transactions.length === 0) {
    return NextResponse.json({ error: '거래 데이터가 없습니다' }, { status: 400 });
  }

  const results = { success: 0, failed: 0, errors: [] as string[] };

  for (const tx of transactions) {
    const { error } = await supabase.rpc('create_transaction_with_balance', {
      p_type: tx.type,
      p_amount: tx.amount,
      p_account_id: tx.account_id,
      p_category_id: tx.category_id,
      p_transfer_to_account_id: tx.transfer_to_account_id || null,
      p_date: tx.date,
      p_memo: tx.memo || null,
      p_created_by: user.id,
    });

    if (error) {
      results.failed++;
      results.errors.push(error.message);
    } else {
      results.success++;
    }
  }

  return NextResponse.json(results);
}
