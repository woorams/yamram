'use client';

import { useCallback, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { ReceiptRecognitionResult } from '@/types';

interface ReceiptScannerProps {
  onRecognized: (result: ReceiptRecognitionResult) => void;
}

export function ReceiptScanner({ onRecognized }: ReceiptScannerProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [imageData, setImageData] = useState<{ base64: string; mimeType: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
    setError(null);

    if (!file.type.match(/^image\/(jpeg|png|webp|gif)$/)) {
      setError('JPEG, PNG, WebP, GIF만 지원합니다');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('이미지 크기는 5MB 이하여야 합니다');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setPreview(dataUrl);
      // Extract base64 data (remove data:image/...;base64, prefix)
      const base64 = dataUrl.split(',')[1];
      setImageData({ base64, mimeType: file.type });
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const clearImage = useCallback(() => {
    setPreview(null);
    setImageData(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleRecognize = async () => {
    if (!imageData) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/transactions/recognize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData.base64, mimeType: imageData.mimeType }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '인식에 실패했습니다');
        return;
      }

      onRecognized(data);
      clearImage();
    } catch {
      setError('네트워크 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {!preview ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50'
          }`}
        >
          <div className="text-3xl mb-2">📷</div>
          <p className="text-sm font-medium">영수증 사진 업로드</p>
          <p className="text-xs text-muted-foreground mt-1">
            클릭하거나 이미지를 드래그하세요
          </p>
        </div>
      ) : (
        <div className="relative">
          <img
            src={preview}
            alt="영수증 미리보기"
            className="w-full max-h-48 object-contain rounded-lg border border-border"
          />
          <button
            type="button"
            onClick={clearImage}
            className="absolute top-2 right-2 rounded-full bg-background/80 border border-border w-7 h-7 flex items-center justify-center text-sm hover:bg-destructive hover:text-destructive-foreground transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {preview && (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleRecognize}
          disabled={loading}
        >
          {loading ? '인식 중...' : '영수증 인식하기'}
        </Button>
      )}
    </div>
  );
}
