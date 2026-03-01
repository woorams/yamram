'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { formatKRW } from '@/lib/constants';
import type { DashboardData } from '@/types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = [
  '#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#14b8a6',
];

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

type Preset = '7days' | '14days' | '28days' | 'thisMonth' | 'lastMonth';

function getPresetRange(preset: Preset): { start: string; end: string } {
  const today = new Date();
  switch (preset) {
    case '7days': {
      const start = new Date(today);
      start.setDate(today.getDate() - 6);
      return { start: formatDate(start), end: formatDate(today) };
    }
    case '14days': {
      const start = new Date(today);
      start.setDate(today.getDate() - 13);
      return { start: formatDate(start), end: formatDate(today) };
    }
    case '28days': {
      const start = new Date(today);
      start.setDate(today.getDate() - 27);
      return { start: formatDate(start), end: formatDate(today) };
    }
    case 'thisMonth': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { start: formatDate(start), end: formatDate(end) };
    }
    case 'lastMonth': {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return { start: formatDate(start), end: formatDate(end) };
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

export default function DashboardPage() {
  const defaultRange = getPresetRange('thisMonth');
  const [startDate, setStartDate] = useState(defaultRange.start);
  const [endDate, setEndDate] = useState(defaultRange.end);
  const [activePreset, setActivePreset] = useState<Preset | null>('thisMonth');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/dashboard?start_date=${startDate}&end_date=${endDate}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [startDate, endDate]);

  function applyPreset(preset: Preset) {
    const range = getPresetRange(preset);
    setStartDate(range.start);
    setEndDate(range.end);
    setActivePreset(preset);
  }

  function handleDateChange(type: 'start' | 'end', value: string) {
    setActivePreset(null);
    if (type === 'start') setStartDate(value);
    else setEndDate(value);
  }

  const displayStart = startDate.replace(/-/g, '.');
  const displayEnd = endDate.replace(/-/g, '.');

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date range selector */}
      <div className="space-y-3">
        <h1 className="text-xl font-bold">{displayStart} ~ {displayEnd}</h1>
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
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={startDate}
            onChange={(e) => handleDateChange('start', e.target.value)}
            className="w-40"
          />
          <span className="text-muted-foreground">~</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => handleDateChange('end', e.target.value)}
            className="w-40"
          />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              총 수입
            </div>
            <p className="mt-1 text-2xl font-bold text-blue-600">
              {formatKRW(data?.summary.total_income || 0)}원
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingDown className="h-4 w-4 text-red-500" />
              총 지출
            </div>
            <p className="mt-1 text-2xl font-bold text-red-600">
              {formatKRW(data?.summary.total_expense || 0)}원
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Wallet className="h-4 w-4" />
              잔액
            </div>
            <p className="mt-1 text-2xl font-bold">
              {formatKRW(data?.summary.balance || 0)}원
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Budget progress */}
      {data?.budgets && data.budgets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">예산 현황</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.budgets.map((b) => {
              const pct = b.amount > 0 ? Math.round(((b.spent || 0) / b.amount) * 100) : 0;
              return (
                <div key={b.id}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span>{b.category?.name || '전체 예산'}</span>
                    <span className={pct > 100 ? 'text-red-500 font-semibold' : ''}>
                      {formatKRW(b.spent || 0)} / {formatKRW(b.amount)}원 ({pct}%)
                    </span>
                  </div>
                  <Progress value={Math.min(pct, 100)} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Category donut */}
      {data?.category_breakdown && data.category_breakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">카테고리별 지출</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <div className="h-48 w-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.category_breakdown}
                      dataKey="total"
                      nameKey="category_name"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                    >
                      {data.category_breakdown.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => `${formatKRW(Number(value))}원`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1">
                {data.category_breakdown.map((cat, i) => (
                  <div key={cat.category_id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      />
                      <span>{cat.category_name}</span>
                    </div>
                    <span>{formatKRW(cat.total)}원 ({cat.percentage}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent transactions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">최근 거래</CardTitle>
            <Link href="/transactions">
              <Button variant="ghost" size="sm">전체보기</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data?.recent_transactions?.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-20">{tx.date}</span>
                  <span>{tx.category?.name || tx.type}</span>
                </div>
                <span className={tx.type === '수입' ? 'text-blue-600' : 'text-red-600'}>
                  {tx.type === '수입' ? '+' : '-'}{formatKRW(tx.amount)}원
                </span>
              </div>
            ))}
            {(!data?.recent_transactions || data.recent_transactions.length === 0) && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                해당 기간 거래 내역이 없습니다
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
