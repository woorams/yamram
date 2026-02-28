'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { formatKRW } from '@/lib/constants';
import type { Account } from '@/types';
import { SettingsNav } from '@/components/settings/settings-nav';

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    fetchAccounts();
  }, []);

  async function fetchAccounts() {
    const res = await fetch('/api/accounts');
    const data = await res.json();
    setAccounts(data);
  }

  async function addAccount() {
    if (!newName.trim()) return;
    const res = await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), balance: 0 }),
    });
    if (res.ok) {
      toast.success('계좌가 추가되었습니다');
      setNewName('');
      fetchAccounts();
    }
  }

  async function updateAccount(id: string) {
    if (!editName.trim()) return;
    const res = await fetch(`/api/accounts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim(), balance: 0 }),
    });
    if (res.ok) {
      toast.success('수정되었습니다');
      setEditingId(null);
      fetchAccounts();
    }
  }

  async function deleteAccount(id: string) {
    if (!confirm('이 계좌를 삭제하시겠습니까?')) return;
    const res = await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('삭제되었습니다');
      fetchAccounts();
    }
  }

  const activeAccounts = accounts.filter((a) => a.is_active);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">설정</h1>
      <SettingsNav />
      <Card>
        <CardHeader>
          <CardTitle>계좌 관리</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-2">
            <Input
              placeholder="새 계좌명"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addAccount()}
            />
            <Button onClick={addAccount} size="sm">
              <Plus className="mr-1 h-4 w-4" />
              추가
            </Button>
          </div>

          <div className="space-y-2">
            {activeAccounts.map((acc) => (
              <div
                key={acc.id}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                {editingId === acc.id ? (
                  <div className="flex flex-1 items-center gap-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && updateAccount(acc.id)}
                      className="h-8"
                    />
                    <Button size="sm" variant="ghost" onClick={() => updateAccount(acc.id)}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div>
                      <span className="font-medium">{acc.name}</span>
                      <span className="ml-3 text-sm text-muted-foreground">
                        {formatKRW(acc.balance)}원
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(acc.id);
                          setEditName(acc.name);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteAccount(acc.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {activeAccounts.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                계좌가 없습니다
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
