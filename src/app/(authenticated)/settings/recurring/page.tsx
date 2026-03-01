'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatKRW } from '@/lib/constants';
import type { Account, Category, RecurringTransaction } from '@/types';
import { SettingsNav } from '@/components/settings/settings-nav';

export default function RecurringPage() {
  const [recurring, setRecurring] = useState<RecurringTransaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // 수정 다이얼로그
  const [editItem, setEditItem] = useState<RecurringTransaction | null>(null);
  const [editType, setEditType] = useState<'수입' | '지출'>('지출');
  const [editAmount, setEditAmount] = useState('');
  const [editAccountId, setEditAccountId] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editDay, setEditDay] = useState(1);
  const [editMemo, setEditMemo] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    const [recRes, accRes, catRes] = await Promise.all([
      fetch('/api/recurring-transactions').then((r) => r.json()),
      fetch('/api/accounts').then((r) => r.json()),
      fetch('/api/categories').then((r) => r.json()),
    ]);
    setRecurring(recRes);
    setAccounts(accRes);
    setCategories(catRes);
    setLoading(false);
  }

  function openEdit(item: RecurringTransaction) {
    setEditItem(item);
    setEditType(item.type);
    setEditAmount(String(item.amount));
    setEditAccountId(item.account_id);
    setEditCategoryId(item.category_id || '');
    setEditDay(item.day_of_month);
    setEditMemo(item.memo || '');
  }

  async function handleUpdate() {
    if (!editItem) return;
    setSaving(true);

    const body = {
      type: editType,
      amount: parseInt(editAmount),
      account_id: editAccountId,
      category_id: editCategoryId || null,
      day_of_month: editDay,
      memo: editMemo || null,
    };

    const res = await fetch(`/api/recurring-transactions/${editItem.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      toast.success('수정되었습니다');
      setEditItem(null);
      fetchAll();
    } else {
      toast.error('수정 실패');
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('이 반복 거래를 비활성화하시겠습니까?')) return;

    const res = await fetch(`/api/recurring-transactions/${id}`, {
      method: 'DELETE',
    });

    if (res.ok) {
      toast.success('비활성화되었습니다');
      fetchAll();
    } else {
      toast.error('삭제 실패');
    }
  }

  const activeAccounts = accounts.filter((a) => a.is_active);
  const filteredCategories = categories.filter(
    (c) => c.is_active && c.type === editType
  );

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">설정</h1>
      <SettingsNav />
      <Card>
        <CardHeader>
          <CardTitle>반복 거래 관리</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              로딩 중...
            </p>
          ) : recurring.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              등록된 반복 거래가 없습니다.
              <br />
              거래 입력 시 &quot;매월 반복&quot;을 체크하면 자동으로 추가됩니다.
            </p>
          ) : (
            <div className="space-y-2">
              {recurring.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-md border px-3 py-3"
                >
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={item.type === '수입' ? 'default' : 'destructive'}>
                        {item.type}
                      </Badge>
                      <span className="font-medium">
                        {formatKRW(item.amount)}원
                      </span>
                      <span className="text-sm text-muted-foreground">
                        매월 {item.day_of_month}일
                      </span>
                    </div>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <span>{item.account?.name}</span>
                      {item.category && (
                        <>
                          <span>·</span>
                          <span>{item.category.name}</span>
                        </>
                      )}
                      {item.memo && (
                        <>
                          <span>·</span>
                          <span>{item.memo}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEdit(item)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 수정 다이얼로그 */}
      <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>반복 거래 수정</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>구분</Label>
              <div className="flex gap-2">
                {(['수입', '지출'] as const).map((t) => (
                  <Button
                    key={t}
                    type="button"
                    variant={editType === t ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setEditType(t)}
                    className="flex-1"
                  >
                    {t}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>금액</Label>
              <Input
                type="number"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                min={1}
              />
            </div>

            <div className="space-y-2">
              <Label>계좌</Label>
              <Select value={editAccountId} onValueChange={setEditAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="계좌 선택" />
                </SelectTrigger>
                <SelectContent>
                  {activeAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>카테고리</Label>
              <Select value={editCategoryId} onValueChange={setEditCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="카테고리 선택" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>반복일</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm">매월</span>
                <Select value={String(editDay)} onValueChange={(v) => setEditDay(parseInt(v))}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-sm">일</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>메모</Label>
              <Input
                value={editMemo}
                onChange={(e) => setEditMemo(e.target.value)}
                placeholder="메모 (선택)"
                maxLength={200}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleUpdate} className="flex-1" disabled={saving}>
                {saving ? '저장 중...' : '수정하기'}
              </Button>
              <Button variant="outline" onClick={() => setEditItem(null)}>
                취소
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
