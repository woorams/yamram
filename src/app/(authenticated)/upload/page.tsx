'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, Upload, FileSpreadsheet, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { parseExcelFile } from '@/lib/excel';
import type { Account, Category, ExcelRow, ValidationError } from '@/types';

export default function UploadPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [parsedRows, setParsedRows] = useState<ExcelRow[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/accounts').then((r) => r.json()),
      fetch('/api/categories').then((r) => r.json()),
    ]).then(([acc, cat]) => {
      setAccounts(acc);
      setCategories(cat);
    });
  }, []);

  const processFile = useCallback(
    async (file: File) => {
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        toast.error('.xlsx 파일만 업로드 가능합니다');
        return;
      }

      const buffer = await file.arrayBuffer();
      const catNames = categories.filter((c) => c.is_active).map((c) => c.name);
      const accNames = accounts.filter((a) => a.is_active).map((a) => a.name);
      const result = parseExcelFile(buffer, catNames, accNames);

      setParsedRows(result.valid);
      setErrors(result.errors);

      if (result.errors.length > 0) {
        toast.warning(`${result.errors.length}개 오류 발견`);
      } else {
        toast.success(`${result.valid.length}건 파싱 완료`);
      }
    },
    [accounts, categories]
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  async function handleUpload() {
    if (parsedRows.length === 0) return;
    setUploading(true);

    // Map names to IDs
    const transactions = parsedRows.map((row) => {
      const account = accounts.find((a) => a.name === row.account);
      const category = categories.find((c) => c.name === row.category);
      return {
        type: row.type,
        amount: row.amount,
        account_id: account?.id,
        category_id: row.type === '이체' ? null : (category?.id || null),
        transfer_to_account_id: row.transferTo ? accounts.find((a) => a.name === row.transferTo)?.id || null : null,
        date: row.date,
        memo: row.memo || null,
      };
    });

    const res = await fetch('/api/transactions/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactions }),
    });

    const result = await res.json();
    if (result.success > 0) {
      toast.success(`${result.success}건 등록 완료`);
      setParsedRows([]);
      setErrors([]);
    }
    if (result.failed > 0) {
      toast.error(`${result.failed}건 실패`);
    }
    setUploading(false);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">데이터 업로드</h1>

      {/* Template download */}
      <Card>
        <CardContent className="pt-4">
          <a href="/api/template" download>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              양식 다운로드 (.xlsx)
            </Button>
          </a>
          <p className="mt-2 text-sm text-muted-foreground">
            양식에 맞춰 데이터를 입력한 후 업로드하세요
          </p>
        </CardContent>
      </Card>

      {/* File upload */}
      <Card>
        <CardHeader>
          <CardTitle>엑셀 파일 업로드</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
              isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <FileSpreadsheet className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="mb-2 text-sm text-muted-foreground">
              파일을 끌어다 놓거나
            </p>
            <label>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileInput}
                className="hidden"
              />
              <Button variant="outline" size="sm" asChild>
                <span>파일 선택</span>
              </Button>
            </label>
            <p className="mt-2 text-xs text-muted-foreground">.xlsx 파일만 가능</p>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      {(parsedRows.length > 0 || errors.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              미리보기
              <Badge variant="default">
                <CheckCircle className="mr-1 h-3 w-3" />
                정상: {parsedRows.length}건
              </Badge>
              {errors.length > 0 && (
                <Badge variant="destructive">
                  <XCircle className="mr-1 h-3 w-3" />
                  오류: {errors.length}건
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Error list */}
            {errors.length > 0 && (
              <div className="mb-4 rounded-md bg-destructive/10 p-3">
                <p className="mb-2 text-sm font-medium text-destructive">오류 항목</p>
                {errors.map((err, i) => (
                  <p key={i} className="text-xs text-destructive">
                    행 {err.row}: [{err.field}] {err.message}
                  </p>
                ))}
              </div>
            )}

            {/* Valid rows preview */}
            {parsedRows.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="p-2">날짜</th>
                      <th className="p-2">구분</th>
                      <th className="p-2">금액</th>
                      <th className="p-2">카테고리</th>
                      <th className="p-2">계좌</th>
                      <th className="p-2">메모</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.slice(0, 20).map((row, i) => (
                      <tr key={i} className="border-b">
                        <td className="p-2">{row.date}</td>
                        <td className="p-2">{row.type}</td>
                        <td className="p-2">{row.amount.toLocaleString()}</td>
                        <td className="p-2">{row.category}</td>
                        <td className="p-2">{row.account}</td>
                        <td className="p-2">{row.memo || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedRows.length > 20 && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    ... 외 {parsedRows.length - 20}건
                  </p>
                )}
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <Button onClick={handleUpload} disabled={uploading || parsedRows.length === 0}>
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? '등록 중...' : `${parsedRows.length}건 등록`}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setParsedRows([]);
                  setErrors([]);
                }}
              >
                전체 취소
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
