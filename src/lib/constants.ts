export const DEFAULT_EXPENSE_CATEGORIES = [
  '생활비', '식비', '교통비', '주거비', '대출 상환',
  '경조사비', '양가 부모님', '의료/건강', '쇼핑/의류',
  '문화/여가', '보험', '통신비', '구독료', '기타',
];

export const DEFAULT_INCOME_CATEGORIES = [
  '급여 (우람)', '급여 (윤미)', '부수입', '기타 수입',
];

export const DEFAULT_ACCOUNTS = [
  '우람 급여 통장',
  '윤미 급여 통장',
  '우람 용돈 통장',
  '윤미 용돈 통장',
  '공동 생활비 통장',
];

export const TRANSACTION_TYPES = ['수입', '지출', '이체'] as const;

export const NAV_ITEMS = [
  { href: '/dashboard', label: '대시보드', icon: 'LayoutDashboard' },
  { href: '/transactions', label: '거래내역', icon: 'Receipt' },
  { href: '/upload', label: '업로드', icon: 'Upload' },
  { href: '/analytics', label: '분석', icon: 'BarChart3' },
  { href: '/settings/categories', label: '설정', icon: 'Settings' },
] as const;

export const ITEMS_PER_PAGE = 20;

export function formatKRW(amount: number): string {
  return new Intl.NumberFormat('ko-KR').format(amount);
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
  });
}
