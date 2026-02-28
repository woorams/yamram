'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { formatKRW } from '@/lib/constants';
import type { Budget, Category } from '@/types';
import { SettingsNav } from '@/components/settings/settings-nav';

export default function BudgetsPage() {
  const now = new Date();
  const [month, setMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  );
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryId, setNewCategoryId] = useState<string>('overall');
  const [newAmount, setNewAmount] = useState('');

  useEffect(() => {
    fetchData();
  }, [month]);

  async function fetchData() {
    const [budgetsRes, catsRes] = await Promise.all([
      fetch(`/api/budgets?month=${month}`),
      fetch('/api/categories'),
    ]);
    setBudgets(await budgetsRes.json());
    setCategories(await catsRes.json());
  }

  async function addBudget() {
    const amount = parseInt(newAmount);
    if (!amount || amount <= 0) {
      toast.error('금액을 입력하세요');
      return;
    }

    const res = await fetch('/api/budgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        month,
        category_id: newCategoryId === 'overall' ? null : newCategoryId,
        amount,
      }),
    });

    if (res.ok) {
      toast.success('예산이 설정되었습니다');
      setNewAmount('');
      fetchData();
    }
  }

  async function deleteBudget(id: string) {
    const res = await fetch(`/api/budgets/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('삭제되었습니다');
      fetchData();
    }
  }

  async function copyFromLastMonth() {
    const [y, m] = month.split('-').map(Number);
    const prev = new Date(y, m - 2, 1);
    const fromMonth = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;

    const res = await fetch('/api/budgets/copy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromMonth, toMonth: month }),
    });

    if (res.ok) {
      toast.success('지난달 예산이 복사되었습니다');
      fetchData();
    } else {
      const data = await res.json();
      toast.error(data.error || '복사 실패');
    }
  }

  const expenseCategories = categories.filter((c) => c.type === '지출' && c.is_active);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">설정</h1>
      <SettingsNav />
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>예산 관리</CardTitle>
            <div className="flex items-center gap-2">
              <Input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-40"
              />
              <Button variant="outline" size="sm" onClick={copyFromLastMonth}>
                <Copy className="mr-1 h-4 w-4" />
                지난달 복사
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-2">
            <Select value={newCategoryId} onValueChange={setNewCategoryId}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="overall">전체 예산</SelectItem>
                {expenseCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              placeholder="금액"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addBudget()}
            />
            <Button onClick={addBudget} size="sm">
              설정
            </Button>
          </div>

          <div className="space-y-2">
            {budgets.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <div>
                  <span className="font-medium">
                    {b.category ? b.category.name : '전체 예산'}
                  </span>
                  <span className="ml-3 text-sm">{formatKRW(b.amount)}원</span>
                </div>
                <Button size="sm" variant="ghost" onClick={() => deleteBudget(b.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {budgets.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                설정된 예산이 없습니다
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
