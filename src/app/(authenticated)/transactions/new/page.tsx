'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ReceiptScanner } from '@/components/receipt-scanner';
import type { Account, Category, ReceiptRecognitionResult, TransactionType } from '@/types';

export default function NewTransactionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');

  const [type, setType] = useState<TransactionType>('지출');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [transferToAccountId, setTransferToAccountId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [memo, setMemo] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [dayOfMonth, setDayOfMonth] = useState(new Date().getDate());

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
    if (editId) {
      loadTransaction(editId);
    }
  }, [editId]);

  // 날짜 변경 시 dayOfMonth 기본값 업데이트
  useEffect(() => {
    if (date) {
      const d = new Date(date + 'T00:00:00');
      setDayOfMonth(d.getDate());
    }
  }, [date]);

  async function loadTransaction(id: string) {
    const res = await fetch(`/api/transactions?page=1`);
    const data = await res.json();
    const tx = data.data?.find((t: { id: string }) => t.id === id);
    if (tx) {
      setType(tx.type);
      setAmount(String(tx.amount));
      setAccountId(tx.account_id);
      setCategoryId(tx.category_id || '');
      setTransferToAccountId(tx.transfer_to_account_id || '');
      setDate(tx.date);
      setMemo(tx.memo || '');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const body = {
      type,
      amount: parseInt(amount),
      account_id: accountId,
      category_id: type === '이체' ? null : (categoryId || null),
      transfer_to_account_id: type === '이체' ? transferToAccountId : null,
      date,
      memo: memo || null,
    };

    const url = editId ? `/api/transactions/${editId}` : '/api/transactions';
    const method = editId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    console.log('API response:', res.status, data);

    if (res.ok) {
      // 반복 거래 템플릿 생성
      if (isRecurring && !editId && type !== '이체') {
        const recurringBody = {
          type,
          amount: parseInt(amount),
          account_id: accountId,
          category_id: categoryId || null,
          day_of_month: dayOfMonth,
          memo: memo || null,
        };

        const recurRes = await fetch('/api/recurring-transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(recurringBody),
        });

        if (recurRes.ok) {
          toast.success('거래 등록 + 매월 반복 설정 완료');
        } else {
          toast.success('거래는 등록되었지만 반복 설정에 실패했습니다');
        }
      } else {
        toast.success(editId ? '수정되었습니다' : '등록되었습니다');
      }
      router.push('/transactions');
    } else {
      const errMsg = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
      toast.error(errMsg || '저장 실패');
    }
    setLoading(false);
  }

  function handleRecognized(result: ReceiptRecognitionResult) {
    if (result.amount) setAmount(String(result.amount));
    if (result.date) setDate(result.date);
    if (result.memo) setMemo(result.memo);
    setType('지출');

    if (result.category_hint) {
      const matched = categories.find(
        (c) => c.is_active && c.type === '지출' && c.name === result.category_hint
      );
      if (matched) setCategoryId(matched.id);
    }

    const confidenceMsg = result.confidence === 'high' ? '높음' : result.confidence === 'medium' ? '보통' : '낮음';
    toast.success(`영수증 인식 완료 (확신도: ${confidenceMsg})`);
  }

  const filteredCategories = categories.filter(
    (c) => c.is_active && c.type === (type === '수입' ? '수입' : '지출')
  );
  const activeAccounts = accounts.filter((a) => a.is_active);
  const showRecurring = !editId && type !== '이체';

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>{editId ? '거래 수정' : '새 거래 입력'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Receipt Scanner (new mode only) */}
            {!editId && (
              <ReceiptScanner onRecognized={handleRecognized} />
            )}

            {/* Type toggle */}
            <div className="space-y-2">
              <Label>구분</Label>
              <div className="flex gap-2">
                {(['수입', '지출', '이체'] as TransactionType[]).map((t) => (
                  <Button
                    key={t}
                    type="button"
                    variant={type === t ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setType(t)}
                    className="flex-1"
                  >
                    {t}
                  </Button>
                ))}
              </div>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">금액</Label>
              <div className="relative">
                <Input
                  id="amount"
                  type="number"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  min={1}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  원
                </span>
              </div>
            </div>

            {/* Account */}
            <div className="space-y-2">
              <Label>{type === '이체' ? '출금 계좌' : '계좌'}</Label>
              <Select value={accountId} onValueChange={setAccountId} required>
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

            {/* Transfer to account */}
            {type === '이체' && (
              <div className="space-y-2">
                <Label>입금 계좌</Label>
                <Select value={transferToAccountId} onValueChange={setTransferToAccountId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="입금 계좌 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeAccounts
                      .filter((a) => a.id !== accountId)
                      .map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Category (not for transfer) */}
            {type !== '이체' && (
              <div className="space-y-2">
                <Label>카테고리</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
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
            )}

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date">날짜</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            {/* Recurring toggle */}
            {showRecurring && (
              <div className="space-y-3">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    className="h-4 w-4 rounded border-border"
                  />
                  <span className="text-sm font-medium">매월 반복</span>
                </label>

                {isRecurring && (
                  <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 p-3">
                    <span className="text-sm">매월</span>
                    <Select
                      value={String(dayOfMonth)}
                      onValueChange={(v) => setDayOfMonth(parseInt(v))}
                    >
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
                    <span className="text-sm">일에 자동 등록</span>
                  </div>
                )}
              </div>
            )}

            {/* Memo */}
            <div className="space-y-2">
              <Label htmlFor="memo">메모</Label>
              <Input
                id="memo"
                placeholder="메모 (선택)"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                maxLength={200}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? '저장 중...' : editId ? '수정하기' : '저장하기'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                취소
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
