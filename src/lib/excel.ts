import * as XLSX from 'xlsx';
import type { ExcelRow, ParsedExcelData, ValidationError } from '@/types';

const EXPECTED_HEADERS = ['구분', '금액', '계좌', '입금 계좌 (이체시)', '카테고리', '날짜', '메모'];
const VALID_TYPES = ['수입', '지출', '이체'];

export function parseExcelFile(
  buffer: ArrayBuffer,
  categoryNames: string[],
  accountNames: string[]
): ParsedExcelData {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { header: EXPECTED_HEADERS, range: 1 });

  const valid: ExcelRow[] = [];
  const errors: ValidationError[] = [];

  rows.forEach((row, index) => {
    const rowNum = index + 2;
    const rowErrors: ValidationError[] = [];

    // 구분
    const type = String(row['구분'] || '').trim();
    if (!VALID_TYPES.includes(type)) {
      rowErrors.push({ row: rowNum, field: '구분', message: `구분은 수입/지출/이체 중 하나여야 합니다 (입력값: ${type})` });
    }

    // 금액
    const amount = Number(row['금액']);
    if (!amount || amount <= 0) {
      rowErrors.push({ row: rowNum, field: '금액', message: '금액은 0보다 커야 합니다' });
    }

    // 계좌
    const account = String(row['계좌'] || '').trim();
    if (!account || !accountNames.includes(account)) {
      rowErrors.push({ row: rowNum, field: '계좌', message: `존재하지 않는 계좌입니다: ${account}` });
    }

    // 입금 계좌 (이체시)
    const transferTo = String(row['입금 계좌 (이체시)'] || '').trim();
    if (type === '이체' && (!transferTo || !accountNames.includes(transferTo))) {
      rowErrors.push({ row: rowNum, field: '입금 계좌', message: `이체 시 입금 계좌가 필요합니다: ${transferTo}` });
    }

    // 카테고리 (이체가 아닌 경우)
    const category = String(row['카테고리'] || '').trim();
    if (type !== '이체' && category && !categoryNames.includes(category)) {
      rowErrors.push({ row: rowNum, field: '카테고리', message: `존재하지 않는 카테고리입니다: ${category}` });
    }

    // 날짜
    let dateStr = '';
    const rawDate = row['날짜'];
    if (!rawDate) {
      rowErrors.push({ row: rowNum, field: '날짜', message: '날짜가 비어있습니다' });
    } else if (typeof rawDate === 'number') {
      const date = XLSX.SSF.parse_date_code(rawDate);
      dateStr = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    } else {
      dateStr = String(rawDate);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        rowErrors.push({ row: rowNum, field: '날짜', message: '날짜 형식이 올바르지 않습니다 (YYYY-MM-DD)' });
      }
    }

    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
    } else {
      valid.push({
        date: dateStr,
        type: type as ExcelRow['type'],
        amount,
        category,
        account,
        transferTo: type === '이체' ? transferTo : undefined,
        memo: row['메모'] ? String(row['메모']) : undefined,
      });
    }
  });

  return { valid, errors };
}
