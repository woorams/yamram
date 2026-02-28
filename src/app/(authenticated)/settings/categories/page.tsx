'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import type { Category, CategoryType } from '@/types';
import { SettingsNav } from '@/components/settings/settings-nav';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [activeTab, setActiveTab] = useState<CategoryType>('지출');

  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    const res = await fetch('/api/categories');
    const data = await res.json();
    setCategories(data);
  }

  async function addCategory() {
    if (!newName.trim()) return;
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), type: activeTab }),
    });
    if (res.ok) {
      toast.success('카테고리가 추가되었습니다');
      setNewName('');
      fetchCategories();
    } else {
      toast.error('추가 실패');
    }
  }

  async function updateCategory(id: string) {
    if (!editName.trim()) return;
    const cat = categories.find((c) => c.id === id);
    const res = await fetch(`/api/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim(), type: cat?.type }),
    });
    if (res.ok) {
      toast.success('수정되었습니다');
      setEditingId(null);
      fetchCategories();
    }
  }

  async function deleteCategory(id: string) {
    if (!confirm('이 카테고리를 삭제하시겠습니까?')) return;
    const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('삭제되었습니다');
      fetchCategories();
    }
  }

  const filtered = categories.filter((c) => c.type === activeTab && c.is_active);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">설정</h1>
      <SettingsNav />
      <Card>
        <CardHeader>
          <CardTitle>카테고리 관리</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as CategoryType)}>
            <TabsList className="mb-4">
              <TabsTrigger value="지출">지출</TabsTrigger>
              <TabsTrigger value="수입">수입</TabsTrigger>
            </TabsList>

            <div className="mb-4 flex gap-2">
              <Input
                placeholder="새 카테고리명"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCategory()}
              />
              <Button onClick={addCategory} size="sm">
                <Plus className="mr-1 h-4 w-4" />
                추가
              </Button>
            </div>

            <TabsContent value={activeTab} className="mt-0">
              <div className="space-y-2">
                {filtered.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    {editingId === cat.id ? (
                      <div className="flex flex-1 items-center gap-2">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && updateCategory(cat.id)}
                          className="h-8"
                        />
                        <Button size="sm" variant="ghost" onClick={() => updateCategory(cat.id)}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <span>{cat.name}</span>
                          <Badge variant="secondary">{cat.type}</Badge>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingId(cat.id);
                              setEditName(cat.name);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteCategory(cat.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {filtered.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    카테고리가 없습니다
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
