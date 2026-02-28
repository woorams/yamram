'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatKRW } from '@/lib/constants';
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line, Legend,
  ResponsiveContainer,
} from 'recharts';

const COLORS = [
  '#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#14b8a6',
];

interface AnalyticsData {
  daily: { date: string; income: number; expense: number }[];
  categories: { name: string; total: number }[];
  monthlyTrend: { month: string; income: number; expense: number }[];
  budgetProgress: { name: string; budget: number; spent: number; percentage: number }[];
}

export default function AnalyticsPage() {
  const now = new Date();
  const [month, setMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  );
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics?month=${month}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [month]);

  function changeMonth(delta: number) {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  const [monthYear, monthNum] = month.split('-');

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const totalExpense = data?.categories?.reduce((s, c) => s + c.total, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Month selector */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => changeMonth(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-bold">
          {monthYear}년 {parseInt(monthNum)}월 분석
        </h1>
        <Button variant="ghost" size="sm" onClick={() => changeMonth(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Category donut */}
      {data?.categories && data.categories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">카테고리별 지출</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <div className="h-56 w-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.categories}
                      dataKey="total"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      label={({ name, percent }) =>
                        `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {data.categories.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${formatKRW(Number(value))}원`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1">
                {data.categories.map((cat, i) => (
                  <div key={cat.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      />
                      <span>{cat.name}</span>
                    </div>
                    <span>
                      {formatKRW(cat.total)}원
                      ({totalExpense > 0 ? Math.round((cat.total / totalExpense) * 100) : 0}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daily bar chart */}
      {data?.daily && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">일별 지출 현황</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.daily}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => v.split('-')[2]}
                    fontSize={12}
                  />
                  <YAxis
                    tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`}
                    fontSize={12}
                  />
                  <Tooltip
                    formatter={(value) => `${formatKRW(Number(value))}원`}
                    labelFormatter={(label) => label}
                  />
                  <Bar dataKey="expense" fill="#ef4444" name="지출" />
                  <Bar dataKey="income" fill="#3b82f6" name="수입" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly trend */}
      {data?.monthlyTrend && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">월별 추이 (최근 6개월)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="month"
                    tickFormatter={(v) => {
                      const [, m] = v.split('-');
                      return `${parseInt(m)}월`;
                    }}
                    fontSize={12}
                  />
                  <YAxis
                    tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`}
                    fontSize={12}
                  />
                  <Tooltip formatter={(value) => `${formatKRW(Number(value))}원`} />
                  <Legend />
                  <Line type="monotone" dataKey="income" stroke="#3b82f6" name="수입" strokeWidth={2} />
                  <Line type="monotone" dataKey="expense" stroke="#ef4444" name="지출" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Budget progress */}
      {data?.budgetProgress && data.budgetProgress.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">예산 대비 현황</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.budgetProgress.map((b) => (
              <div key={b.name}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium">{b.name}</span>
                  <span className={b.percentage > 100 ? 'text-red-500 font-semibold' : ''}>
                    {formatKRW(b.spent)} / {formatKRW(b.budget)}원 ({b.percentage}%)
                    {b.percentage >= 80 && b.percentage < 100 && ' ⚠️'}
                    {b.percentage >= 100 && ' 🚨'}
                  </span>
                </div>
                <Progress
                  value={Math.min(b.percentage, 100)}
                  className="h-3"
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {(!data?.categories || data.categories.length === 0) &&
        (!data?.budgetProgress || data.budgetProgress.length === 0) && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              이번 달 데이터가 없습니다. 거래를 입력해보세요.
            </CardContent>
          </Card>
        )}
    </div>
  );
}
