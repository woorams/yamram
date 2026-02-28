import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { transactionSchema } from '@/lib/validators';
import { ITEMS_PER_PAGE } from '@/lib/constants';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const searchParams = request.nextUrl.searchParams;

  const page = parseInt(searchParams.get('page') || '1');
  const accountId = searchParams.get('account_id');
  const categoryId = searchParams.get('category_id');
  const type = searchParams.get('type');
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');

  let query = supabase
    .from('transactions')
    .select('*, account:accounts!account_id(*), category:categories(*), transfer_to_account:accounts!transfer_to_account_id(*), profile:profiles(*)', { count: 'exact' })
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (accountId) query = query.eq('account_id', accountId);
  if (categoryId) query = query.eq('category_id', categoryId);
  if (type) query = query.eq('type', type);
  if (startDate) query = query.gte('date', startDate);
  if (endDate) query = query.lte('date', endDate);

  const from = (page - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    data,
    total: count || 0,
    page,
    totalPages: Math.ceil((count || 0) / ITEMS_PER_PAGE),
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const parsed = transactionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  console.log('Transaction POST body:', parsed.data);
  console.log('User ID:', user.id);

  const { data, error } = await supabase.rpc('create_transaction_with_balance', {
    p_type: parsed.data.type,
    p_amount: parsed.data.amount,
    p_account_id: parsed.data.account_id,
    p_category_id: parsed.data.category_id,
    p_transfer_to_account_id: parsed.data.transfer_to_account_id,
    p_date: parsed.data.date,
    p_memo: parsed.data.memo,
    p_created_by: user.id,
  });

  if (error) {
    console.error('Transaction error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ id: data }, { status: 201 });
}
