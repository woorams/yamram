import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { budgetSchema } from '@/lib/validators';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const month = request.nextUrl.searchParams.get('month');

  let query = supabase
    .from('budgets')
    .select('*, category:categories(*)')
    .order('created_at');

  if (month) query = query.eq('month', month);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();
  const parsed = budgetSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('budgets')
    .upsert(parsed.data, { onConflict: 'month,category_id' })
    .select('*, category:categories(*)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
