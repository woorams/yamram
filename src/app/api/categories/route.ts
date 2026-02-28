import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { categorySchema } from '@/lib/validators';

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('type')
    .order('sort_order');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();
  const parsed = categorySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const { data: maxOrder } = await supabase
    .from('categories')
    .select('sort_order')
    .eq('type', parsed.data.type)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single();

  const { data, error } = await supabase
    .from('categories')
    .insert({
      ...parsed.data,
      sort_order: (maxOrder?.sort_order || 0) + 1,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
