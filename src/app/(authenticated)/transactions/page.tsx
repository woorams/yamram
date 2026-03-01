'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { formatKRW } from '@/lib/constants';
import type { Transaction, Account, Category } from '@/types';

type Preset = '7days' | '14days' | '28days' | 'thisMonth' | 'lastMonth';

function fmt(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getPresetRange(preset: Preset): { start: string; end: string } {
  const today = new Date();
  switch (preset) {
    case '7days': {
      const s = new Date(today); s.setDate(today.getDate() - 6);
      return { start: fmt(s), end: fmt(today) };
    }
    case '14days': {
      const s = new Date(today); s.setDate(today.getDate() - 13);
      return { start: fmt(s), end: fmt(today) };
    }
    case '28days': {
      const s = new Date(today); s.setDate(today.getDate() - 27);
      return { start: fmt(s), end: fmt(today) };
    }
    case 'thisMonth': {
      const s = new Date(today.getFullYear(), today.getMonth(), 1);
      const e = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { start: fmt(s), end: fmt(e) };
    }
    case 'lastMonth': {
      const s = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const e = new Date(today.getFullYear(), today.getMonth(), 0);
      return { start: fmt(s), end: fmt(e) };
    }
  }
}

const PRESETS: { key: Preset; label: string }[] = [
  { key: '7days', label: '최근 7일' },
  { key: '14days', label: '최근 14일' },
  { key: '28days', label: '최근 28일' },
  { key: 'thisMonth', label: '이번달' },
  { key: 'lastMonth', label: '전월' },
];

export default function TransactionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const defaultRange = getPresetRange('thisMonth');

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'));
  const [totalPages, setTotalPages] = useState(1);
  const [activePreset, setActivePreset] = useState<Preset | null>('thisMonth');
  const [filters, setFilters] = useState({
    start_date: searchParams.get('start_date') || defaultRange.start,
    end_date: searchParams.get('end_date') || defaultRange.end,
    account_id: searchParams.get('account_id') || '',
    category_id: searchParams.get('category_id') || '',
    type: searchParams.get('type') || '',
  });

  const fetchTransactions = useCallback(async () => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    if (filters.start_date) params.set('start_date', filters.start_date);
    if (filters.end_date) params.set('end_date', filters.end_date);
    if (filters.account_id) params.set('account_id', filters.account_id);
    if (filters.category_id) params.set('category_id', filters.category_id);
    if (filters.type) params.set('type', filters.type);

    const res = await fetch(`/api/transactions?${params}`);
    const data = await res.json();
    setTransactions(data.data || []);
    setTotal(data.total || 0);
    setTotalPages(data.totalPages || 1);
  }, [page, filters]);

  useEffect(() => {
    Promise.all([
      fetch('/api/accounts').then((r) => r.json()),
      fetch('/api/categories').then((r) => r.json()),
    ]).then(([acc, cat]) => {
      setAccounts(acc);
      setCategories(cat);
    });
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  async function deleteTransaction(id: string) {
    if (!confirm('이 거래를 삭제하시겠습니까?')) return;
    const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('삭제되었습니다');
      fetchTransactions();
    } else {
      toast.error('삭제 실패');
    }
  }

  function applyPreset(preset: Preset) {
    const range = getPresetRange(preset);
    setFilters((f) => ({ ...f, start_date: range.start, end_date: range.end }));
    setActivePreset(preset);
    setPage(1);
  }

  const typeColor = (type: string) => {
    if (type === '수입') return 'text-blue-600';
    if (type === '지출') return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">거래내역</h1>
        <Link href="/transactions/new">
          <Button size="sm">
            <Plus className="mr-1 h-4 w-4" />
            새 거래
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="mb-4">
        <CardContent className="space-y-3 pt-4">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <Button
                key={p.key}
                variant={activePreset === p.key ? 'default' : 'outline'}
                size="sm"
                onClick={() => applyPreset(p.key)}
              >
                {p.label}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              type="date"
              value={filters.start_date}
              onChange={(e) => { setFilters((f) => ({ ...f, start_date: e.target.value })); setActivePreset(null); setPage(1); }}
              className="w-40"
            />
            <span className="self-center">~</span>
            <Input
              type="date"
              value={filters.end_date}
              onChange={(e) => { setFilters((f) => ({ ...f, end_date: e.target.value })); setActivePreset(null); setPage(1); }}
              className="w-40"
            />
            <Select
              value={filters.type || 'all'}
              onValueChange={(v) => { setFilters((f) => ({ ...f, type: v === 'all' ? '' : v })); setPage(1); }}
            >
              <SelectTrigger className="w-28">
                <SelectValue placeholder="구분" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="수입">수입</SelectItem>
                <SelectItem value="지출">지출</SelectItem>
                <SelectItem value="이체">이체</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.account_id || 'all'}
              onValueChange={(v) => { setFilters((f) => ({ ...f, account_id: v === 'all' ? '' : v })); setPage(1); }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="계좌" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 계좌</SelectItem>
                {accounts.filter((a) => a.is_active).map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transactions list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">
            총 {total}건
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <div className="flex flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                  <span className="text-xs text-muted-foreground w-20">
                    {tx.date}
                  </span>
                  <Badge variant="outline" className="w-fit">{tx.type}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {tx.category?.name || (tx.type === '이체' ? '이체' : '-')}
                  </span>
                  <span className={`font-semibold ${typeColor(tx.type)}`}>
                    {tx.type === '수입' ? '+' : '-'}{formatKRW(tx.amount)}원
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {tx.account?.name}
                    {tx.transfer_to_account && ` → ${tx.transfer_to_account.name}`}
                  </span>
                  {tx.memo && (
                    <span className="text-xs text-muted-foreground truncate max-w-32">
                      {tx.memo}
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => router.push(`/transactions/new?edit=${tx.id}`)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteTransaction(tx.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {transactions.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                거래 내역이 없습니다
              </p>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
