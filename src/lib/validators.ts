import { z } from 'zod/v4';

export const transactionSchema = z.object({
  type: z.enum(['수입', '지출', '이체']),
  amount: z.number().positive('금액은 0보다 커야 합니다'),
  account_id: z.string().uuid(),
  category_id: z.string().uuid().nullable(),
  transfer_to_account_id: z.string().uuid().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  memo: z.string().max(200).nullable(),
});

export const categorySchema = z.object({
  name: z.string().min(1, '카테고리명을 입력하세요').max(50),
  type: z.enum(['수입', '지출']),
  icon: z.string().nullable().optional(),
});

export const accountSchema = z.object({
  name: z.string().min(1, '계좌명을 입력하세요').max(50),
  balance: z.number().default(0),
});

export const budgetSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  category_id: z.string().uuid().nullable(),
  amount: z.number().nonnegative('예산은 0 이상이어야 합니다'),
});

export const loginSchema = z.object({
  email: z.email('올바른 이메일을 입력하세요'),
  password: z.string().min(1, '비밀번호를 입력하세요'),
});

export type TransactionInput = z.infer<typeof transactionSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type AccountInput = z.infer<typeof accountSchema>;
export type BudgetInput = z.infer<typeof budgetSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
