import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { transactionSchema } from '@/lib/validators';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json();
  const parsed = transactionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const { error } = await supabase.rpc('update_transaction_with_balance', {
    p_transaction_id: id,
    p_type: parsed.data.type,
    p_amount: parsed.data.amount,
    p_account_id: parsed.data.account_id,
    p_category_id: parsed.data.category_id,
    p_transfer_to_account_id: parsed.data.transfer_to_account_id,
    p_date: parsed.data.date,
    p_memo: parsed.data.memo,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { error } = await supabase.rpc('delete_transaction_with_balance', {
    p_transaction_id: id,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
