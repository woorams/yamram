'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import type { Account, Category, TransactionType } from '@/types';

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
      toast.success(editId ? '수정되었습니다' : '등록되었습니다');
      router.push('/transactions');
    } else {
      const errMsg = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
      toast.error(errMsg || '저장 실패');
    }
    setLoading(false);
  }

  const filteredCategories = categories.filter(
    (c) => c.is_active && c.type === (type === '수입' ? '수입' : '지출')
  );
  const activeAccounts = accounts.filter((a) => a.is_active);

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>{editId ? '거래 수정' : '새 거래 입력'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
