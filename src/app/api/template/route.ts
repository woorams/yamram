import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import * as XLSX from 'xlsx';

export async function GET() {
  const supabase = await createClient();

  const [{ data: categories }, { data: accounts }] = await Promise.all([
    supabase.from('categories').select('name, type').eq('is_active', true).order('sort_order'),
    supabase.from('accounts').select('name').eq('is_active', true).order('sort_order'),
  ]);

  const wb = XLSX.utils.book_new();

  // 거래내역 입력 폼과 동일한 필드 구성
  const headers = ['구분', '금액', '계좌', '입금 계좌 (이체시)', '카테고리', '날짜', '메모'];
  const example1 = ['지출', 32000, '공동 생활비 통장', '', '식비', '2026-02-28', '점심 식사'];
  const example2 = ['수입', 3500000, '우람 급여 통장', '', '급여 (우람)', '2026-02-25', '2월 급여'];
  const example3 = ['이체', 500000, '우람 급여 통장', '우람 용돈 통장', '', '2026-02-25', '용돈 이체'];

  const ws = XLSX.utils.aoa_to_sheet([headers, example1, example2, example3]);

  // 열 너비 설정
  ws['!cols'] = [
    { wch: 8 },   // 구분
    { wch: 12 },  // 금액
    { wch: 20 },  // 계좌
    { wch: 22 },  // 입금 계좌
    { wch: 15 },  // 카테고리
    { wch: 12 },  // 날짜
    { wch: 30 },  // 메모
  ];

  XLSX.utils.book_append_sheet(wb, ws, '거래내역');

  // 참고 시트: 카테고리/계좌 목록
  const expCats = categories?.filter((c) => c.type === '지출').map((c) => c.name) || [];
  const incCats = categories?.filter((c) => c.type === '수입').map((c) => c.name) || [];
  const accNames = accounts?.map((a) => a.name) || [];
  const maxLen = Math.max(expCats.length, incCats.length, accNames.length);

  const refData: string[][] = [['구분', '지출 카테고리', '수입 카테고리', '계좌']];
  for (let i = 0; i < maxLen; i++) {
    refData.push([
      i === 0 ? '수입 / 지출 / 이체' : '',
      expCats[i] || '',
      incCats[i] || '',
      accNames[i] || '',
    ]);
  }

  const refWs = XLSX.utils.aoa_to_sheet(refData);
  refWs['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, refWs, '참고 (카테고리,계좌)');

  const uint8 = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as Uint8Array;

  return new NextResponse(uint8, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="lamyam_template.xlsx"',
    },
  });
}
