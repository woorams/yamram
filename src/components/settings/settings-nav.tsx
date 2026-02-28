'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const settingsLinks = [
  { href: '/settings/categories', label: '카테고리' },
  { href: '/settings/accounts', label: '계좌' },
  { href: '/settings/budgets', label: '예산' },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <div className="mb-6 flex gap-2">
      {settingsLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            pathname === link.href
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
          )}
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}
