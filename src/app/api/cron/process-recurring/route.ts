import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  // Vercel Cron 인증
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const today = now.getDate();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // 이번 달의 마지막 날
  const lastDayOfMonth = new Date(year, month, 0).getDate();

  // 오늘 day_of_month가 매칭되는 반복 거래 조회
  // 31일로 설정했는데 해당 월이 짧으면 → 월말에 처리
  let query = supabase
    .from('recurring_transactions')
    .select('*')
    .eq('is_active', true);

  if (today === lastDayOfMonth) {
    // 월말이면: day_of_month >= 오늘 (28~31일 설정 모두 처리)
    query = query.gte('day_of_month', today);
  } else {
    query = query.eq('day_of_month', today);
  }

  const { data: recurring, error: fetchError } = await query;

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!recurring || recurring.length === 0) {
    return NextResponse.json({ message: 'No recurring transactions to process', processed: 0 });
  }

  // 이번 달 기준 날짜 (중복 체크용)
  const currentMonthStart = `${year}-${String(month).padStart(2, '0')}-01`;

  let processed = 0;
  const errors: string[] = [];

  for (const rt of recurring) {
    // 이미 이번 달에 처리됨 → 스킵
    if (rt.last_processed_date && rt.last_processed_date >= currentMonthStart) {
      continue;
    }

    // 거래 날짜: 오늘
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(today).padStart(2, '0')}`;

    // 기존 RPC로 거래 생성
    const { error: txError } = await supabase.rpc('create_transaction_with_balance', {
      p_type: rt.type,
      p_amount: rt.amount,
      p_account_id: rt.account_id,
      p_category_id: rt.category_id,
      p_transfer_to_account_id: null,
      p_date: dateStr,
      p_memo: rt.memo ? `[반복] ${rt.memo}` : '[반복]',
      p_created_by: rt.created_by,
    });

    if (txError) {
      errors.push(`${rt.id}: ${txError.message}`);
      continue;
    }

    // last_processed_date 업데이트
    await supabase
      .from('recurring_transactions')
      .update({ last_processed_date: dateStr, updated_at: new Date().toISOString() })
      .eq('id', rt.id);

    processed++;
  }

  return NextResponse.json({
    message: `Processed ${processed} recurring transactions`,
    processed,
    errors: errors.length > 0 ? errors : undefined,
  });
}
